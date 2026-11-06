"""Common/shared Pydantic schemas."""

from __future__ import annotations

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: bool = True
    message: str
    details: dict = {}


class SuccessResponse(BaseModel):
    """Generic success response."""

    success: bool = True
    message: str


class PaginationParams(BaseModel):
    """Pagination query parameters."""

    page: int = 1
    page_size: int = 50

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    version: str = "0.1.0"

