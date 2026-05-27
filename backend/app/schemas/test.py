from pydantic import BaseModel, Field, HttpUrl, model_validator
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Any


ENGINE_MAP = {
    "uat": "browser_use",
    "ui_audit": "midscene",
    "ux_audit": "playwright_mcp",
    "browser_use": "browser_use",
    "midscene": "midscene",
    "playwright_mcp": "playwright_mcp",
}


class CreateTestSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    target_url: str = Field(..., max_length=2048)
    engine: str = Field(...)
    instructions: str | None = Field(default=None)
    llm_provider: str | None = Field(default=None)
    llm_model: str | None = Field(default=None)
    auth_config: dict[str, Any] | None = None
    uploaded_file_path: str | None = None
    run_immediately: bool = True

    @model_validator(mode="after")
    def normalize_engine(self):
        mapped = ENGINE_MAP.get(self.engine)
        if not mapped:
            raise ValueError(f"Invalid engine: {self.engine}. Use: uat, ui_audit, ux_audit")
        self.engine = mapped
        if not self.instructions:
            self.instructions = f"Navigate to {self.target_url} and verify the page loads correctly"
        return self


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
