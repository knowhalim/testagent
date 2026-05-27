from pydantic import BaseModel, Field, HttpUrl
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Any


class CreateTestSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    target_url: str = Field(..., max_length=2048)
    engine: str = Field(..., pattern=r"^(browser_use|midscene|playwright_mcp)$")
    instructions: str = Field(..., min_length=1)
    llm_provider: str = Field(..., pattern=r"^(ollama|openai|anthropic)$")
    llm_model: str = Field(..., min_length=1, max_length=255)
    auth_config: dict[str, Any] | None = None
    uploaded_file_path: str | None = None


class TestStepResponse(BaseModel):
    id: UUID
    test_id: UUID
    step_number: int
    action: str
    expected: str | None = None
    actual: str | None = None
    status: str
    screenshot_path: str | None = None
    accessibility_data: dict[str, Any] | None = None
    visual_diff_path: str | None = None
    duration_ms: int | None = None
    tokens_used: int = 0
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TestResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    target_url: str
    engine: str
    instructions: str
    uploaded_file_path: str | None = None
    llm_provider: str
    llm_model: str
    status: str
    auth_config: dict[str, Any] | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int | None = None
    total_steps: int = 0
    passed_steps: int = 0
    failed_steps: int = 0
    tokens_used: int = 0
    cost_usd: Decimal | None = None
    summary: str | None = None
    created_at: datetime
    steps: list[TestStepResponse] = []

    model_config = {"from_attributes": True}


class TestListFilters(BaseModel):
    status: str | None = None
    engine: str | None = None
    search: str | None = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
    sort_by: str = "created_at"
    sort_order: str = Field(default="desc", pattern=r"^(asc|desc)$")


class PaginatedTests(BaseModel):
    items: list[TestResponse]
    total: int
    page: int
    per_page: int
    pages: int
