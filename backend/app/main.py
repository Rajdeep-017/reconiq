"""ReconIQ FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_v1_router
from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.schemas.common import HealthResponse


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title="ReconIQ",
        description="AI-Powered D2C Financial Reconciliation Platform",
        version="0.1.0",
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

    # Health check
    @app.get("/health", response_model=HealthResponse, tags=["System"])
    def health_check() -> HealthResponse:
        return HealthResponse(status="healthy", version="0.1.0")

    return app


app = create_app()

