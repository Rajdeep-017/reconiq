"""User management endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.database.connection import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.user import (
    UserListResponse,
    UserResponse,
    UserRoleUpdateRequest,
    UserUpdateRequest,
)
from app.services.user import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "",
    response_model=UserListResponse,
    summary="List all users (admin)",
    dependencies=[Depends(require_permission(Permission.MANAGE_USERS))],
)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> UserListResponse:
    """List all active users with pagination. Requires MANAGE_USERS permission."""
    service = UserService(db)
    users, total = service.list_users(page=page, page_size=page_size)
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID",
    dependencies=[Depends(require_permission(Permission.MANAGE_USERS))],
)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Get a specific user by ID. Requires MANAGE_USERS permission."""
    service = UserService(db)
    user = service.get_user(user_id)
    return UserResponse.model_validate(user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update own profile",
)
def update_profile(
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update the current user's profile (name, email)."""
    service = UserService(db)
    user = service.update_profile(current_user, data)
    return UserResponse.model_validate(user)


@router.patch(
    "/{user_id}/role",
    response_model=UserResponse,
    summary="Change user role (admin)",
)
def update_role(
    user_id: UUID,
    data: UserRoleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Change a user's role. Only finance_cofounder can do this."""
    service = UserService(db)
    user = service.update_role(user_id, data, current_user)
    return UserResponse.model_validate(user)


@router.delete(
    "/{user_id}",
    response_model=SuccessResponse,
    summary="Deactivate a user (admin)",
)
def deactivate_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Deactivate a user account. Only finance_cofounder can do this."""
    service = UserService(db)
    service.deactivate_user(user_id, current_user)
    return SuccessResponse(message="User deactivated successfully")

