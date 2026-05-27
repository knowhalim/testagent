from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.auth import RegisterSchema, LoginSchema, TokenResponse, UserResponse
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    data: RegisterSchema,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user, token_response = await AuthService.register(db, data)
    await AuditService.log(db, "user.registered", user_id=user.id, details={"email": user.email, "role": user.role})
    return token_response


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginSchema,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user, token_response = await AuthService.login(db, data)
    await AuditService.log(db, "user.login", user_id=user.id, details={"email": user.email})
    return token_response


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    return await AuthService.refresh(db, refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)
