"""Application configuration using pydantic-settings."""

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# The backend can be started from the repository root or from backend/. Load
# the root .env first, then an optional backend/.env for local overrides. Both
# paths are absent inside the production image, where Compose supplies env vars.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    @field_validator("DATABASE_URL", "TEST_DATABASE_URL", mode="before")
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        """Use the installed psycopg 3 driver for provider PostgreSQL URLs."""
        for scheme in ("postgres://", "postgresql://"):
            if value.startswith(scheme):
                return f"postgresql+psycopg://{value[len(scheme):]}"
        return value

    model_config = SettingsConfigDict(
        env_file=(_REPO_ROOT / ".env", _BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Runtime environment: "dev", "test", "staging", or "production".
    ENV: str = "dev"

    # Database
    DATABASE_URL: str = (
        "postgresql+psycopg://reconiq:reconiq_dev@localhost:5432/reconiq"
    )
    TEST_DATABASE_URL: str = (
        "postgresql+psycopg://reconiq:reconiq_dev@localhost:5432/reconiq_test"
    )

    # Security
    SECRET_KEY: str = "change-me-to-a-random-64-char-string-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ]

    # File Storage
    UPLOAD_DIR: str = "../storage/uploads"
    EXPORT_DIR: str = "../storage/exports"
    MAX_UPLOAD_SIZE_MB: int = 50

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI (optional)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    # Deployment / migrations
    DATABASE_CONNECT_TIMEOUT: int = 10
    MIGRATION_CONNECT_ATTEMPTS: int = 10
    MIGRATION_RETRY_DELAY_SECONDS: float = 3.0
    RUN_MIGRATIONS: bool = True
    UVICORN_WORKERS: int = 2
    FORWARDED_ALLOW_IPS: str = "*"

    # Demo seed (optional; never set for a real customer deployment)
    SAMPLE_DATA_DIR: str = "sample_data/data"
    DEMO_PASSWORD_FINANCE_EXECUTIVE: str | None = None
    DEMO_PASSWORD_FINANCE_COFOUNDER: str | None = None


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()

