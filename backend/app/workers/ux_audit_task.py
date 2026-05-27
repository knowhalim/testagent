import asyncio
import json
import traceback
from datetime import datetime, timezone
from uuid import UUID

import httpx
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


async def _run_ux_audit(test_id: str):
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

        try:
            # Load LLM credentials for the node worker
            from app.services.settings_service import SettingsService
            creds = await SettingsService.get_llm_credentials(db, test.llm_provider)

            # Call the Playwright MCP node sidecar
            request_payload = {
                "test_id": test_id,
                "target_url": test.target_url,
                "instructions": test.instructions,
                "llm_provider": test.llm_provider,
                "llm_model": test.llm_model,
                "llm_credentials": creds,
                "auth_config": test.auth_config,
            }

            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    f"{settings.NODE_WORKER_URL}/playwright/run",
                    json=request_payload,
                )
                response.raise_for_status()
                result_data = response.json()

            # Process results from the node worker
            steps = result_data.get("steps", [])
            total_steps = len(steps)
            passed_steps = 0
            failed_steps = 0
            total_tokens = result_data.get("tokens_used", 0)

            for step_data in steps:
                step_status = step_data.get("status", "passed")
                if step_status == "passed":
                    passed_steps += 1
                elif step_status in ("failed", "error"):
                    failed_steps += 1

                step = TestStep(
                    test_id=UUID(test_id),
                    step_number=step_data.get("step_number", 0),
                    action=step_data.get("action", ""),
                    expected=step_data.get("expected"),
                    actual=step_data.get("actual"),
                    status=step_status,
                    screenshot_path=step_data.get("screenshot_path"),
                    accessibility_data=step_data.get("accessibility_data"),
                    visual_diff_path=step_data.get("visual_diff_path"),
                    duration_ms=step_data.get("duration_ms"),
                    tokens_used=step_data.get("tokens_used", 0),
                    error_message=step_data.get("error_message"),
                )
                db.add(step)
                await db.flush()

                publish_progress(redis_client, test_id, "step_completed", {
                    "step_number": step_data.get("step_number", 0),
                    "action": step_data.get("action", "")[:200],
                    "status": step_status,
                    "total_steps": total_steps,
                    "passed": passed_steps,
                    "failed": failed_steps,
                })

            final_status = "passed" if failed_steps == 0 and total_steps > 0 else "failed"
            summary = result_data.get("summary", f"UX audit completed: {passed_steps}/{total_steps} checks passed.")

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

        except httpx.HTTPStatusError as e:
            error_msg = f"Node worker error: {e.response.status_code} - {e.response.text[:300]}"
            test.status = "error"
            test.completed_at = datetime.now(timezone.utc)
            test.summary = error_msg
            if test.started_at:
                delta = test.completed_at - test.started_at
                test.duration_ms = int(delta.total_seconds() * 1000)

            db.add(TestStep(
                test_id=UUID(test_id),
                step_number=1,
                action="UX Audit execution",
                status="error",
                error_message=error_msg,
            ))
            await db.commit()
            publish_progress(redis_client, test_id, "error", {"status": "error", "error": error_msg})

        except Exception as e:
            error_msg = str(e)
            test.status = "error"
            test.completed_at = datetime.now(timezone.utc)
            test.summary = f"Error: {error_msg}"
            if test.started_at:
                delta = test.completed_at - test.started_at
                test.duration_ms = int(delta.total_seconds() * 1000)

            db.add(TestStep(
                test_id=UUID(test_id),
                step_number=1,
                action="UX Audit execution",
                status="error",
                error_message=error_msg,
            ))
            await db.commit()
            publish_progress(redis_client, test_id, "error", {"status": "error", "error": error_msg})

    redis_client.close()


@celery_app.task(name="app.workers.ux_audit_task.run_ux_audit", bind=True, max_retries=1)
def run_ux_audit(self, test_id: str):
    """Celery task to run a UX audit using Playwright MCP via the node sidecar."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_run_ux_audit(test_id))
        loop.close()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)
