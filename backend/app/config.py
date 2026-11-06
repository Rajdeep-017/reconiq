"""Application configuration using pydantic-settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

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


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()

