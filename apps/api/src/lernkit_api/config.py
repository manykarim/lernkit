"""Application configuration.

Loaded once at startup from environment variables. All Lernkit env vars are
prefixed `LERNKIT_` except for the conventional ones (API_HOST, API_PORT).
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Process-wide settings. Safe to instantiate more than once; memoized at import."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    env: str = Field(default="development", alias="LERNKIT_ENV")
    log_level: str = Field(default="info", alias="LERNKIT_LOG_LEVEL")
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")  # noqa: S104 — intentional bind-all in container
    api_port: int = Field(default=8000, alias="API_PORT")


settings = Settings()
