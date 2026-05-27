from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime


class CreateUserSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="tester", pattern=r"^(admin|tester|viewer)$")


class UpdateUserSchema(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    role: str | None = Field(default=None, pattern=r"^(admin|tester|viewer)$")
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserListResponse(BaseModel):
    items: list["UserItemResponse"]
    total: int


class UserItemResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    is_active: bool
    email_verified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
