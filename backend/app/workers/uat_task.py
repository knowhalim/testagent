import asyncio
import json
import os
import traceback
from datetime import datetime, timezone
from uuid import UUID

import redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.config import get_settings
from app.models.test import Test
from app.models.test_step import TestStep
from app.workers.celery_app import celery_app

settings = get_settings()


def get_sync_redis():
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def get_async_db_session():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def publish_progress(redis_client, test_id: str, event: str, data: dict):
    channel = f"testagent:test:{test_id}:progress"
    payload = json.dumps({"event": event, **data})
    redis_client.publish(channel, payload)


async def _run_uat_test(test_id: str):
    session_factory = get_async_db_session()
    redis_client = get_sync_redis()

    async with session_factory() as db:
        result = await db.execute(select(Test).where(Test.id == UUID(test_id)))
        test = result.scalar_one_or_none()
        if not test:
            return

        test.status = "running"
        test.started_at = datetime.now(timezone.utc)
        await db.commit()

        publish_progress(redis_client, test_id, "started", {"status": "running"})

        total_steps = 0
        passed_steps = 0
        failed_steps = 0
        total_tokens = 0

        try:
            # Load LLM credentials from settings
            from app.services.settings_service import SettingsService
            creds = await SettingsService.get_llm_credentials(db, test.llm_provider)

            # Build LLM instance based on provider
            llm = None
            if test.llm_provider == "openai":
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(
                    model=test.llm_model or creds.get("model", "gpt-4o"),
                    api_key=creds.get("api_key", ""),
                    temperature=0.0,
                )
            elif test.llm_provider == "anthropic":
                from langchain_anthropic import ChatAnthropic
                llm = ChatAnthropic(
                    model=test.llm_model or creds.get("model", "claude-sonnet-4-20250514"),
                    api_key=creds.get("api_key", ""),
                    temperature=0.0,
                )
            elif test.llm_provider == "ollama":
                from langchain_community.chat_models import ChatOllama
                llm = ChatOllama(
                    model=test.llm_model or creds.get("model", "llama3.1"),
                    base_url=creds.get("base_url", "http://localhost:11434"),
                    temperature=0.0,
                )

            if not llm:
                raise ValueError(f"Could not initialize LLM for provider: {test.llm_provider}")

            # Import and run browser-use agent
            from browser_use import Agent

            screenshot_dir = os.path.join(settings.DATA_DIR, "screenshots", test_id)
            os.makedirs(screenshot_dir, exist_ok=True)

            agent = Agent(
                task=f"Go to {test.target_url} and perform the following test:\n{test.instructions}",
                llm=llm,
            )

            agent_result = await agent.run()

            # Process agent history into test steps
            history = agent_result.history if hasattr(agent_result, 'history') else []
            for i, step_data in enumerate(history):
                total_steps += 1
                step_number = i + 1

                action_text = ""
                actual_text = ""
                step_status = "passed"
                error_msg = None
                step_tokens = 0

                if hasattr(step_data, 'model_output') and step_data.model_output:
                    action_info = step_data.model_output
                    if hasattr(action_info, 'current_state'):
                        action_text = str(getattr(action_info.current_state, 'thought', ''))
                    if hasattr(action_info, 'action') and action_info.action:
                        actions = action_info.action
                        if isinstance(actions, list) and len(actions) > 0:
                            action_text += f" | Action: {actions[0]}"
                        elif actions:
                            action_text += f" | Action: {actions}"

                if hasattr(step_data, 'result') and step_data.result:
                    result_data = step_data.result
                    if hasattr(result_data, 'extracted_content'):
                        actual_text = str(result_data.extracted_content) if result_data.extracted_content else ""
                    if hasattr(result_data, 'error') and result_data.error:
                        step_status = "failed"
                        error_msg = str(result_data.error)
                        failed_steps += 1
                    else:
                        passed_steps += 1

                if not action_text:
                    action_text = f"Step {step_number}"

                screenshot_path = None
                if hasattr(step_data, 'result') and step_data.result:
                    if hasattr(step_data.result, 'screenshot') and step_data.result.screenshot:
                        screenshot_filename = f"step_{step_number}.png"
                        screenshot_full_path = os.path.join(screenshot_dir, screenshot_filename)
                        import base64
                        try:
                            img_data = base64.b64decode(step_data.result.screenshot)
                            with open(screenshot_full_path, "wb") as f:
                                f.write(img_data)
                            screenshot_path = f"screenshots/{test_id}/{screenshot_filename}"
                        except Exception:
                            pass

                step = TestStep(
                    test_id=UUID(test_id),
                    step_number=step_number,
                    action=action_text,
                    actual=actual_text,
                    status=step_status,
                    screenshot_path=screenshot_path,
                    duration_ms=None,
                    tokens_used=step_tokens,
                    error_message=error_msg,
                )
                db.add(step)
                await db.flush()

                publish_progress(redis_client, test_id, "step_completed", {
                    "step_number": step_number,
                    "action": action_text[:200],
                    "status": step_status,
                    "total_steps": total_steps,
                    "passed": passed_steps,
                    "failed": failed_steps,
                })

            # If no steps from history, create a summary step
            if total_steps == 0:
                total_steps = 1
                final_text = ""
                if hasattr(agent_result, 'final_result') and agent_result.final_result:
                    final_text = str(agent_result.final_result)
                    passed_steps = 1
                    step_status = "passed"
                else:
                    final_text = "Test completed but no detailed steps were recorded."
                    passed_steps = 1
                    step_status = "passed"

                step = TestStep(
                    test_id=UUID(test_id),
                    step_number=1,
                    action="Execute test instructions",
                    actual=final_text,
                    status=step_status,
                    tokens_used=0,
                )
                db.add(step)
                await db.flush()

            # Determine final status
            final_status = "passed" if failed_steps == 0 else "failed"

            summary = ""
            if hasattr(agent_result, 'final_result') and agent_result.final_result:
                summary = str(agent_result.final_result)
            else:
                summary = f"Test completed: {passed_steps}/{total_steps} steps passed."

            # Get token usage if available
            if hasattr(agent_result, 'total_tokens'):
                total_tokens = agent_result.total_tokens

            test.status = final_status
            test.completed_at = datetime.now(timezone.utc)
            test.total_steps = total_steps
            test.passed_steps = passed_steps
            test.failed_steps = failed_steps
            test.tokens_used = total_tokens
            test.summary = summary
            if test.started_at:
                delta = test.completed_at - test.started_at
                test.duration_ms = int(delta.total_seconds() * 1000)

            await db.commit()

            publish_progress(redis_client, test_id, "completed", {
                "status": final_status,
                "total_steps": total_steps,
                "passed": passed_steps,
                "failed": failed_steps,
                "summary": summary[:500],
            })

        except Exception as e:
            error_detail = traceback.format_exc()
            test.status = "error"
            test.completed_at = datetime.now(timezone.utc)
            test.summary = f"Error: {str(e)}"
            if test.started_at:
                delta = test.completed_at - test.started_at
                test.duration_ms = int(delta.total_seconds() * 1000)

            error_step = TestStep(
                test_id=UUID(test_id),
                step_number=total_steps + 1,
                action="Test execution",
                status="error",
                error_message=str(e),
            )
            db.add(error_step)
            await db.commit()

            publish_progress(redis_client, test_id, "error", {
                "status": "error",
                "error": str(e),
            })

    redis_client.close()


@celery_app.task(name="app.workers.uat_task.run_uat_test", bind=True, max_retries=1)
def run_uat_test(self, test_id: str):
    """Celery task to run a UAT test using browser-use."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_run_uat_test(test_id))
        loop.close()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)
