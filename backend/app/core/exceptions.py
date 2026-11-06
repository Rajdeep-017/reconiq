"""Application exception hierarchy and HTTP error handler registration."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base application exception."""

    def __init__(self, message: str, status_code: int = 500, details: dict | None = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundException(AppException):
    """Resource not found (404)."""

    def __init__(self, message: str = "Resource not found", details: dict | None = None):
        super().__init__(message=message, status_code=404, details=details)


class ConflictException(AppException):
    """Resource conflict, e.g. duplicate (409)."""

    def __init__(self, message: str = "Resource already exists", details: dict | None = None):
        super().__init__(message=message, status_code=409, details=details)


class ForbiddenException(AppException):
    """Insufficient permissions (403)."""

    def __init__(self, message: str = "Insufficient permissions", details: dict | None = None):
        super().__init__(message=message, status_code=403, details=details)


class UnauthorizedException(AppException):
    """Authentication failure (401)."""

    def __init__(self, message: str = "Invalid credentials", details: dict | None = None):
        super().__init__(message=message, status_code=401, details=details)


class ValidationException(AppException):
    """Request validation failure (422)."""

    def __init__(self, message: str = "Validation error", details: dict | None = None):
        super().__init__(message=message, status_code=422, details=details)


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers on the FastAPI app."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "message": exc.message,
                "details": exc.details,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "An unexpected error occurred",
                "details": {},
            },
        )

