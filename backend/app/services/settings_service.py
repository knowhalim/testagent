import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.models.setting import Setting
from app.utils.encryption import encrypt_value, decrypt_value

SETTINGS_CACHE_PREFIX = "testagent:setting:"
SETTINGS_CACHE_TTL = 60  # seconds

ENCRYPTED_KEYS = {
    "openai_api_key",
    "anthropic_api_key",
    "smtp_password",
}

DEFAULT_SETTINGS: dict[str, str] = {
    "app_name": "TestAgent",
    "primary_color": "#6366f1",
    "dark_mode": "true",
    "logo_url": "",
    "ollama_base_url": "http://localhost:11434",
    "ollama_model": "llama3.1",
    "openai_api_key": "",
    "openai_model": "gpt-4o",
    "anthropic_api_key": "",
    "anthropic_model": "claude-sonnet-4-20250514",
    "default_llm_provider": "ollama",
    "smtp_host": "",
    "smtp_port": "587",
    "smtp_username": "",
    "smtp_password": "",
    "smtp_from_email": "",
    "smtp_from_name": "TestAgent",
    "smtp_tls": "true",
}


class SettingsService:

    @staticmethod
    async def get(db: AsyncSession, key: str, redis_client: aioredis.Redis | None = None) -> str | None:
        if redis_client:
            cached = await redis_client.get(f"{SETTINGS_CACHE_PREFIX}{key}")
            if cached is not None:
                return cached

        result = await db.execute(select(Setting).where(Setting.key == key))
        setting = result.scalar_one_or_none()
        if not setting:
            default = DEFAULT_SETTINGS.get(key)
            return default

        value = setting.value
        if setting.is_encrypted and value:
            value = decrypt_value(value)

        if redis_client:
            await redis_client.setex(f"{SETTINGS_CACHE_PREFIX}{key}", SETTINGS_CACHE_TTL, value or "")

        return value

    @staticmethod
    async def get_all(db: AsyncSession, redis_client: aioredis.Redis | None = None) -> dict[str, Any]:
        result = await db.execute(select(Setting))
        settings = result.scalars().all()

        settings_dict: dict[str, Any] = dict(DEFAULT_SETTINGS)

        for s in settings:
            value = s.value
            if s.is_encrypted and value:
                if s.key in ENCRYPTED_KEYS:
                    settings_dict[s.key] = "••••••••" if value else ""
                    continue
                value = decrypt_value(value)
            settings_dict[s.key] = value

        return settings_dict

    @staticmethod
    async def set(
        db: AsyncSession,
        key: str,
        value: str,
        redis_client: aioredis.Redis | None = None,
    ) -> None:
        is_encrypted = key in ENCRYPTED_KEYS
        store_value = encrypt_value(value) if is_encrypted and value else value

        result = await db.execute(select(Setting).where(Setting.key == key))
        existing = result.scalar_one_or_none()

        if existing:
            existing.value = store_value
            existing.is_encrypted = is_encrypted
        else:
            setting = Setting(
                key=key,
                value=store_value,
                is_encrypted=is_encrypted,
            )
            db.add(setting)

        await db.flush()

        if redis_client:
            await redis_client.delete(f"{SETTINGS_CACHE_PREFIX}{key}")

    @staticmethod
    async def set_bulk(
        db: AsyncSession,
        settings_dict: dict[str, Any],
        redis_client: aioredis.Redis | None = None,
    ) -> None:
        for key, value in settings_dict.items():
            str_value = str(value) if value is not None else ""
            if key in ENCRYPTED_KEYS and str_value == "••••••••":
                continue
            await SettingsService.set(db, key, str_value, redis_client)

    @staticmethod
    async def get_llm_config(db: AsyncSession, redis_client: aioredis.Redis | None = None) -> dict[str, Any]:
        keys = [
            "ollama_base_url", "ollama_model",
            "openai_api_key", "openai_model",
            "anthropic_api_key", "anthropic_model",
            "default_llm_provider",
        ]
        config: dict[str, Any] = {}
        for key in keys:
            config[key] = await SettingsService.get(db, key, redis_client)

        return {
            "ollama_base_url": config.get("ollama_base_url", "http://localhost:11434"),
            "ollama_model": config.get("ollama_model", "llama3.1"),
            "openai_api_key_set": bool(config.get("openai_api_key")),
            "openai_model": config.get("openai_model", "gpt-4o"),
            "anthropic_api_key_set": bool(config.get("anthropic_api_key")),
            "anthropic_model": config.get("anthropic_model", "claude-sonnet-4-20250514"),
            "default_provider": config.get("default_llm_provider", "ollama"),
        }

    @staticmethod
    async def get_llm_credentials(db: AsyncSession, provider: str, redis_client: aioredis.Redis | None = None) -> dict[str, str]:
        """Get decrypted LLM credentials for a given provider."""
        if provider == "ollama":
            base_url = await SettingsService.get(db, "ollama_base_url", redis_client) or "http://localhost:11434"
            model = await SettingsService.get(db, "ollama_model", redis_client) or "llama3.1"
            return {"base_url": base_url, "model": model}
        elif provider == "openai":
            api_key = await SettingsService.get(db, "openai_api_key", redis_client) or ""
            model = await SettingsService.get(db, "openai_model", redis_client) or "gpt-4o"
            return {"api_key": api_key, "model": model}
        elif provider == "anthropic":
            api_key = await SettingsService.get(db, "anthropic_api_key", redis_client) or ""
            model = await SettingsService.get(db, "anthropic_model", redis_client) or "claude-sonnet-4-20250514"
            return {"api_key": api_key, "model": model}
        else:
            return {}

    @staticmethod
    async def get_appearance(db: AsyncSession, redis_client: aioredis.Redis | None = None) -> dict[str, Any]:
        app_name = await SettingsService.get(db, "app_name", redis_client) or "TestAgent"
        logo_url = await SettingsService.get(db, "logo_url", redis_client) or None
        primary_color = await SettingsService.get(db, "primary_color", redis_client) or "#6366f1"
        dark_mode_str = await SettingsService.get(db, "dark_mode", redis_client) or "true"

        return {
            "app_name": app_name,
            "logo_url": logo_url,
            "primary_color": primary_color,
            "dark_mode": dark_mode_str.lower() == "true",
        }

    @staticmethod
    async def seed_defaults(db: AsyncSession) -> None:
        """Insert default settings if they don't exist."""
        for key, value in DEFAULT_SETTINGS.items():
            result = await db.execute(select(Setting).where(Setting.key == key))
            if not result.scalar_one_or_none():
                is_encrypted = key in ENCRYPTED_KEYS
                store_value = encrypt_value(value) if is_encrypted and value else value
                db.add(Setting(key=key, value=store_value, is_encrypted=is_encrypted))
        await db.flush()
