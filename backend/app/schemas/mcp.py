from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class CreateMCPTokenSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    expires_in_days: int | None = Field(default=None, ge=1, le=365)


class MCPTokenResponse(BaseModel):
    id: UUID
    name: str
    token: str | None = None  # Only returned on creation
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
