"""Pydantic schemas for user resources."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    """Public user representation."""

    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    """User profile update request."""

    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None


class UserRoleUpdateRequest(BaseModel):
    """Admin request to change a user's role."""

    role: str = Field(
        ..., pattern="^(finance_executive|finance_cofounder)$"
    )


class UserListResponse(BaseModel):
    """Paginated list of users."""

    users: list[UserResponse]
    total: int
    page: int
    page_size: int

