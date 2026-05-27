import math
from datetime import datetime, timezone
from uuid import UUID
from typing import Any

from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.test import Test
from app.models.test_step import TestStep
from app.schemas.test import CreateTestSchema, TestListFilters, PaginatedTests, TestResponse


class TestService:

    @staticmethod
    async def create_test(db: AsyncSession, user_id: UUID, data: CreateTestSchema) -> Test:
        from app.services.settings_service import SettingsService

        llm_provider = data.llm_provider
        llm_model = data.llm_model

        # Fill from admin settings if not provided
        if not llm_provider:
            llm_provider = await SettingsService.get(db, "default_llm_provider") or "openai"
        if not llm_model:
            model_key = f"{llm_provider}_model"
            llm_model = await SettingsService.get(db, model_key) or "gpt-4o"

        test = Test(
            user_id=user_id,
            name=data.name,
            target_url=data.target_url,
            engine=data.engine,
            instructions=data.instructions or f"Navigate to {data.target_url} and verify the page loads correctly",
            uploaded_file_path=data.uploaded_file_path,
            llm_provider=llm_provider,
            llm_model=llm_model,
            auth_config=data.auth_config,
            status="pending",
        )
        db.add(test)
        await db.flush()
        return test

    @staticmethod
    async def get_test(db: AsyncSession, test_id: UUID, user_id: UUID | None = None) -> Test:
        query = (
            select(Test)
            .options(selectinload(Test.steps))
            .where(Test.id == test_id)
        )
        if user_id:
            query = query.where(Test.user_id == user_id)

        result = await db.execute(query)
        test = result.scalar_one_or_none()
        if not test:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found")
        return test

    @staticmethod
    async def list_tests(
        db: AsyncSession, user_id: UUID, filters: TestListFilters
    ) -> PaginatedTests:
        query = select(Test).where(Test.user_id == user_id)

        if filters.status:
            query = query.where(Test.status == filters.status)
        if filters.engine:
            query = query.where(Test.engine == filters.engine)
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.where(
                or_(
                    Test.name.ilike(search_term),
                    Test.target_url.ilike(search_term),
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        sort_col = getattr(Test, filters.sort_by, Test.created_at)
        order_func = desc if filters.sort_order == "desc" else asc
        query = query.order_by(order_func(sort_col))

        offset = (filters.page - 1) * filters.per_page
        query = query.offset(offset).limit(filters.per_page)
        query = query.options(selectinload(Test.steps))

        result = await db.execute(query)
        tests = result.scalars().all()

        return PaginatedTests(
            items=[TestResponse.model_validate(t) for t in tests],
            total=total,
            page=filters.page,
            per_page=filters.per_page,
            pages=math.ceil(total / filters.per_page) if total > 0 else 0,
        )

    @staticmethod
    async def delete_test(db: AsyncSession, test_id: UUID, user_id: UUID) -> None:
        test = await TestService.get_test(db, test_id, user_id)
        await db.delete(test)

    @staticmethod
    async def rerun_test(db: AsyncSession, test_id: UUID, user_id: UUID) -> Test:
        original = await TestService.get_test(db, test_id, user_id)
        new_test = Test(
            user_id=user_id,
            name=original.name,
            target_url=original.target_url,
            engine=original.engine,
            instructions=original.instructions,
            uploaded_file_path=original.uploaded_file_path,
            llm_provider=original.llm_provider,
            llm_model=original.llm_model,
            auth_config=original.auth_config,
            status="pending",
        )
        db.add(new_test)
        await db.flush()
        return new_test

    @staticmethod
    async def add_step(
        db: AsyncSession,
        test_id: UUID,
        step_number: int,
        action: str,
        expected: str | None = None,
        actual: str | None = None,
        step_status: str = "pending",
        screenshot_path: str | None = None,
        accessibility_data: dict | None = None,
        visual_diff_path: str | None = None,
        duration_ms: int | None = None,
        tokens_used: int = 0,
        error_message: str | None = None,
    ) -> TestStep:
        step = TestStep(
            test_id=test_id,
            step_number=step_number,
            action=action,
            expected=expected,
            actual=actual,
            status=step_status,
            screenshot_path=screenshot_path,
            accessibility_data=accessibility_data,
            visual_diff_path=visual_diff_path,
            duration_ms=duration_ms,
            tokens_used=tokens_used,
            error_message=error_message,
        )
        db.add(step)
        await db.flush()
        return step

    @staticmethod
    async def complete_test(
        db: AsyncSession,
        test_id: UUID,
        final_status: str,
        summary: str | None = None,
        total_steps: int = 0,
        passed_steps: int = 0,
        failed_steps: int = 0,
        tokens_used: int = 0,
        cost_usd: float | None = None,
    ) -> Test:
        result = await db.execute(select(Test).where(Test.id == test_id))
        test = result.scalar_one_or_none()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        test.status = final_status
        test.summary = summary
        test.completed_at = datetime.now(timezone.utc)
        test.total_steps = total_steps
        test.passed_steps = passed_steps
        test.failed_steps = failed_steps
        test.tokens_used = tokens_used
        if cost_usd is not None:
            from decimal import Decimal
            test.cost_usd = Decimal(str(cost_usd))

        if test.started_at:
            delta = test.completed_at - test.started_at
            test.duration_ms = int(delta.total_seconds() * 1000)

        await db.flush()
        return test

    @staticmethod
    async def get_stats(db: AsyncSession, user_id: UUID) -> dict[str, Any]:
        base_query = select(Test).where(Test.user_id == user_id)

        total_result = await db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total = total_result.scalar() or 0

        passed_result = await db.execute(
            select(func.count()).select_from(
                base_query.where(Test.status == "passed").subquery()
            )
        )
        passed = passed_result.scalar() or 0

        failed_result = await db.execute(
            select(func.count()).select_from(
                base_query.where(Test.status == "failed").subquery()
            )
        )
        failed = failed_result.scalar() or 0

        running_result = await db.execute(
            select(func.count()).select_from(
                base_query.where(Test.status == "running").subquery()
            )
        )
        running = running_result.scalar() or 0

        pending_result = await db.execute(
            select(func.count()).select_from(
                base_query.where(Test.status == "pending").subquery()
            )
        )
        pending = pending_result.scalar() or 0

        avg_duration_result = await db.execute(
            select(func.avg(Test.duration_ms)).where(
                Test.user_id == user_id,
                Test.duration_ms.isnot(None),
            )
        )
        avg_duration = avg_duration_result.scalar()

        total_tokens_result = await db.execute(
            select(func.sum(Test.tokens_used)).where(Test.user_id == user_id)
        )
        total_tokens = total_tokens_result.scalar() or 0

        total_cost_result = await db.execute(
            select(func.sum(Test.cost_usd)).where(Test.user_id == user_id)
        )
        total_cost = total_cost_result.scalar()

        pass_rate = (passed / total * 100) if total > 0 else 0.0

        return {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "running": running,
            "pending": pending,
            "pass_rate": round(pass_rate, 1),
            "avg_duration_ms": int(avg_duration) if avg_duration else None,
            "total_tokens": total_tokens,
            "total_cost_usd": float(total_cost) if total_cost else 0.0,
        }

    @staticmethod
    def enqueue(test_id: UUID, engine: str) -> str:
        """Dispatch test to the appropriate Celery task based on engine type."""
        from app.workers.uat_task import run_uat_test
        from app.workers.ui_audit_task import run_ui_audit
        from app.workers.ux_audit_task import run_ux_audit

        task_map = {
            "browser_use": run_uat_test,
            "midscene": run_ui_audit,
            "playwright_mcp": run_ux_audit,
        }
        task_func = task_map.get(engine)
        if not task_func:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown engine: {engine}",
            )
        result = task_func.delay(str(test_id))
        return result.id
