import csv
import io
from uuid import UUID
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.dependencies import get_db, get_redis, require_admin
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.setting import SettingsUpdateSchema, SettingsResponse, AppearanceResponse, LLMConfigResponse
from app.schemas.user import CreateUserSchema, UpdateUserSchema, UserListResponse, UserItemResponse
from app.services.settings_service import SettingsService
from app.services.email_service import EmailService
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Settings ───────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=SettingsResponse)
async def get_settings(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis),
) -> SettingsResponse:
    all_settings = await SettingsService.get_all(db, redis_client)
    return SettingsResponse(settings=all_settings)


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(
    data: SettingsUpdateSchema,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis),
) -> SettingsResponse:
    await SettingsService.set_bulk(db, data.settings, redis_client)
    await AuditService.log(
        db, "settings.updated",
        user_id=admin.id,
        details={"keys": list(data.settings.keys())},
        ip_address=request.client.host if request.client else None,
    )
    all_settings = await SettingsService.get_all(db, redis_client)
    return SettingsResponse(settings=all_settings)


@router.post("/settings/test-smtp")
async def test_smtp(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        await EmailService.test_smtp(db)
        return {"success": True, "message": "Test email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP test failed: {str(e)}")


@router.post("/settings/test-llm")
async def test_llm(
    provider: str = Query(..., pattern=r"^(ollama|openai|anthropic)$"),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis),
) -> dict:
    """Test LLM connection by making a simple API call."""
    import httpx

    creds = await SettingsService.get_llm_credentials(db, provider, redis_client)

    try:
        if provider == "ollama":
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{creds['base_url']}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                models = [m["name"] for m in data.get("models", [])]
                return {"success": True, "message": f"Connected. Available models: {', '.join(models[:5])}"}

        elif provider == "openai":
            if not creds.get("api_key"):
                raise HTTPException(status_code=400, detail="OpenAI API key not configured")
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {creds['api_key']}"},
                )
                resp.raise_for_status()
                return {"success": True, "message": f"Connected. Model: {creds['model']}"}

        elif provider == "anthropic":
            if not creds.get("api_key"):
                raise HTTPException(status_code=400, detail="Anthropic API key not configured")
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": creds["api_key"],
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": creds["model"],
                        "max_tokens": 10,
                        "messages": [{"role": "user", "content": "Say hi"}],
                    },
                )
                resp.raise_for_status()
                return {"success": True, "message": f"Connected. Model: {creds['model']}"}

        return {"success": False, "message": "Unknown provider"}

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"LLM test failed: {e.response.text[:200]}")
    except httpx.ConnectError:
        raise HTTPException(status_code=400, detail=f"Cannot connect to {provider} service")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"LLM test failed: {str(e)}")


# ─── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserListResponse:
    count_result = await db.execute(select(func.count()).select_from(User))
    total = count_result.scalar() or 0

    offset = (page - 1) * per_page
    result = await db.execute(
        select(User).order_by(User.created_at).offset(offset).limit(per_page)
    )
    users = result.scalars().all()
    return UserListResponse(
        items=[UserItemResponse.model_validate(u) for u in users],
        total=total,
    )


@router.post("/users", response_model=UserItemResponse, status_code=201)
async def create_user(
    data: CreateUserSchema,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserItemResponse:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already in use")

    user = User(
        name=data.name,
        email=data.email,
        password_hash=AuthService.hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    await AuditService.log(
        db, "admin.user_created",
        user_id=admin.id,
        details={"created_user_id": str(user.id), "email": user.email, "role": user.role},
        ip_address=request.client.host if request.client else None,
    )
    return UserItemResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=UserItemResponse)
async def update_user(
    user_id: UUID,
    data: UpdateUserSchema,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserItemResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.name is not None:
        user.name = data.name
    if data.email is not None:
        existing = await db.execute(select(User).where(User.email == data.email, User.id != user_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email already in use")
        user.email = data.email
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password is not None:
        user.password_hash = AuthService.hash_password(data.password)

    await db.flush()
    await AuditService.log(
        db, "admin.user_updated",
        user_id=admin.id,
        details={"updated_user_id": str(user_id), "fields": [k for k, v in data.model_dump(exclude_none=True).items()]},
        ip_address=request.client.host if request.client else None,
    )
    return UserItemResponse.model_validate(user)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await AuditService.log(
        db, "admin.user_deleted",
        user_id=admin.id,
        details={"deleted_user_id": str(user_id), "email": user.email},
        ip_address=request.client.host if request.client else None,
    )


# ─── Audit Logs ─────────────────────────────────────────────────────────────────

@router.get("/logs")
async def get_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    action: str | None = None,
    user_id: UUID | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar() or 0

    offset = (page - 1) * per_page
    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(per_page)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "items": [
            {
                "id": log.id,
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/logs/export")
async def export_logs(
    action: str | None = None,
    user_id: UUID | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Export audit logs as CSV."""
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    query = query.order_by(desc(AuditLog.created_at)).limit(10000)

    result = await db.execute(query)
    logs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "User ID", "Action", "Details", "IP Address", "Created At"])
    for log in logs:
        writer.writerow([
            log.id,
            str(log.user_id) if log.user_id else "",
            log.action,
            str(log.details) if log.details else "",
            log.ip_address or "",
            log.created_at.isoformat() if log.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )
