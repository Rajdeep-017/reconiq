"""ReconIQ FastAPI application entry point."""
from __future__ import annotations

import logging
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_v1_router
from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.schemas.common import HealthResponse

log = logging.getLogger(__name__)

VERSION = "0.1.0"

# Required environment variables in production (ENV != dev)
_REQUIRED_PROD_VARS = ["DATABASE_URL", "SECRET_KEY"]


def _startup_checks(app: FastAPI) -> None:
    """Validate critical config on startup."""
    settings = get_settings()
    env = settings.ENV

    if env != "dev":
        missing = [v for v in _REQUIRED_PROD_VARS if not os.getenv(v)]
        if missing:
            log.critical("Missing required env vars: %s", missing)
            sys.exit(1)

    # Store for /ready
    app.state.settings = settings


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title="ReconIQ",
        description="Intelligent Financial Reconciliation Platform",
        version=VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    register_exception_handlers(app)

    # Routers
    app.include_router(api_v1_router)

    # Startup validation
    _startup_checks(app)

    # ── System endpoints ──────────────────────────────────────────────

    @app.get("/health", response_model=HealthResponse, tags=["System"])
    def health_check() -> HealthResponse:
        """Lightweight liveness probe — always 200 if the process is running."""
        return HealthResponse(status="healthy", version=VERSION)

    @app.get("/ready", tags=["System"])
    def readiness_check() -> dict:
        """Deep readiness probe — checks DB connectivity and migration state."""
        from sqlalchemy import text
        from app.database.connection import SessionLocal

        checks: dict[str, str] = {}

        # DB reachable?
        try:
            with SessionLocal() as session:
                session.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception as exc:
            checks["database"] = f"error: {exc}"

        # Alembic at head?
        try:
            with SessionLocal() as session:
                row = session.execute(
                    text("SELECT version_num FROM alembic_version LIMIT 1")
                ).scalar()
            checks["migration_version"] = row or "none"
        except Exception:
            checks["migration_version"] = "unknown"

        all_ok = checks.get("database") == "ok"
        return {"ready": all_ok, "checks": checks, "version": VERSION}

    return app


app = create_app()
