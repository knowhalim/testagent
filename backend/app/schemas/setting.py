from pydantic import BaseModel
from typing import Any


class SettingsUpdateSchema(BaseModel):
    settings: dict[str, Any]


class SettingsResponse(BaseModel):
    settings: dict[str, Any]


class AppearanceResponse(BaseModel):
    app_name: str = "TestAgent"
    logo_url: str | None = None
    primary_color: str = "#6366f1"
    dark_mode: bool = True


class LLMConfigResponse(BaseModel):
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"
    openai_api_key_set: bool = False
    openai_model: str = "gpt-4o"
    anthropic_api_key_set: bool = False
    anthropic_model: str = "claude-sonnet-4-20250514"
    default_provider: str = "ollama"
