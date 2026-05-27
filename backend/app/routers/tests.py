import os
import uuid
import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.dependencies import get_db, get_current_user, get_redis
from app.models.user import User
from app.schemas.test import CreateTestSchema, TestResponse, TestListFilters, PaginatedTests
from app.services.test_service import TestService
from app.services.audit_service import AuditService
from app.utils.url_validator import validate_target_url
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/tests", tags=["Tests"])


@router.post("", response_model=TestResponse, status_code=201)
async def create_test(
    data: CreateTestSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TestResponse:
    validate_target_url(data.target_url)
    test = await TestService.create_test(db, current_user.id, data)
    await AuditService.log(
        db, "test.created",
        user_id=current_user.id,
        details={"test_id": str(test.id), "engine": test.engine, "target_url": test.target_url},
    )

    TestService.enqueue(test.id, test.engine)
    test_obj = await TestService.get_test(db, test.id)
    return TestResponse.model_validate(test_obj)


@router.get("", response_model=PaginatedTests)
async def list_tests(
    status_filter: str | None = Query(None, alias="status"),
    engine: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedTests:
    filters = TestListFilters(
        status=status_filter,
        engine=engine,
        search=search,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return await TestService.list_tests(db, current_user.id, filters)


@router.get("/{test_id}", response_model=TestResponse)
async def get_test(
    test_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TestResponse:
    test = await TestService.get_test(db, test_id, current_user.id)
    return TestResponse.model_validate(test)


@router.delete("/{test_id}", status_code=204)
async def delete_test(
    test_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await TestService.delete_test(db, test_id, current_user.id)
    await AuditService.log(
        db, "test.deleted",
        user_id=current_user.id,
        details={"test_id": str(test_id)},
    )


@router.post("/{test_id}/rerun", response_model=TestResponse, status_code=201)
async def rerun_test(
    test_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TestResponse:
    new_test = await TestService.rerun_test(db, test_id, current_user.id)
    TestService.enqueue(new_test.id, new_test.engine)
    await AuditService.log(
        db, "test.rerun",
        user_id=current_user.id,
        details={"original_test_id": str(test_id), "new_test_id": str(new_test.id)},
    )
    test_obj = await TestService.get_test(db, new_test.id)
    return TestResponse.model_validate(test_obj)


@router.get("/{test_id}/stream")
async def stream_test(
    test_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis),
) -> StreamingResponse:
    """Stream test progress via Server-Sent Events using Redis pub/sub."""
    await TestService.get_test(db, test_id, current_user.id)

    async def event_generator() -> AsyncGenerator[str, None]:
        pubsub = redis_client.pubsub()
        channel = f"testagent:test:{test_id}:progress"
        await pubsub.subscribe(channel)
        try:
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    data = message["data"]
                    yield f"data: {data}\n\n"
                    try:
                        parsed = json.loads(data)
                        if parsed.get("event") in ("completed", "failed", "error"):
                            break
                    except (json.JSONDecodeError, TypeError):
                        pass
                else:
                    yield f": keepalive\n\n"
                    await asyncio.sleep(0.5)
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/upload", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Upload a test file (e.g., test plan, expected screenshots)."""
    upload_dir = os.path.join(settings.DATA_DIR, "uploads", str(current_user.id))
    os.makedirs(upload_dir, exist_ok=True)

    allowed_extensions = {".txt", ".md", ".json", ".yaml", ".yml", ".csv", ".png", ".jpg", ".jpeg", ".pdf"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(allowed_extensions)}",
        )

    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum 10MB.",
        )

    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"
    file_path = os.path.join(upload_dir, filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    relative_path = os.path.join("uploads", str(current_user.id), filename)
    return {"path": relative_path, "filename": file.filename, "size": len(content)}
