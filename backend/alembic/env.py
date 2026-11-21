"""Alembic environment configuration."""

import logging
import os
import time
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import OperationalError

from app.config import get_settings
from app.database.base import Base

# Import all models so they register with Base.metadata
import app.models  # noqa: F401

config = context.config

# Override sqlalchemy.url from environment. ConfigParser treats "%" as
# interpolation syntax, so percent-encoded credentials must be escaped.
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

log = logging.getLogger("alembic.env")


def _connect_args() -> dict:
    """Give drivers a bounded connect timeout instead of waiting indefinitely."""
    return {"connect_timeout": int(os.getenv("DATABASE_CONNECT_TIMEOUT", "10"))}


def _connect_with_retry(connectable):
    """Wait for the database to become reachable (common during deployment)."""
    attempts = int(os.getenv("MIGRATION_CONNECT_ATTEMPTS", "10"))
    delay = float(os.getenv("MIGRATION_RETRY_DELAY_SECONDS", "3"))
    for attempt in range(1, attempts + 1):
        try:
            return connectable.connect()
        except OperationalError as exc:
            if attempt >= attempts:
                log.error("Database connection failed after %s attempts: %s", attempts, exc)
                raise
            log.warning(
                "Database not ready (attempt %s/%s): %s. Retrying in %.1fs...",
                attempt,
                attempts,
                exc,
                delay,
            )
            time.sleep(delay)


def _warn_localhost_inside_container() -> None:
    """`localhost` inside a container is the container, not the DB service."""
    if os.path.exists("/.dockerenv") and make_url(settings.DATABASE_URL).host in {
        "localhost",
        "127.0.0.1",
    }:
        log.warning(
            "DATABASE_URL points at localhost but Alembic is running in a container. "
            "Use the database service name (e.g. 'postgres') as the host."
        )


target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    _warn_localhost_inside_container()
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=_connect_args(),
    )

    connection = _connect_with_retry(connectable)
    try:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()
    finally:
        connection.close()
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

