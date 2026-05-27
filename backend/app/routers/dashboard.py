from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.test import Test
from app.schemas.test import TestResponse
from app.services.test_service import TestService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await TestService.get_stats(db, current_user.id)


@router.get("/recent", response_model=list[TestResponse])
async def get_recent(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TestResponse]:
    result = await db.execute(
        select(Test)
        .where(Test.user_id == current_user.id)
        .options(selectinload(Test.steps))
        .order_by(desc(Test.created_at))
        .limit(limit)
    )
    tests = result.scalars().all()
    return [TestResponse.model_validate(t) for t in tests]
