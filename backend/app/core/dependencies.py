"""FastAPI dependencies for authentication and authorization."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.config import get_settings, Settings
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.permissions import Permission, has_permission
from app.core.security import decode_access_token
from app.database.connection import get_db
from app.models.user import User


def get_current_user(
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    """Extract and validate the current user from the Authorization header.

    Expects: Authorization: Bearer <token>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_access_token(
        token, settings.SECRET_KEY, settings.ALGORITHM
    )
    if payload is None:
        raise UnauthorizedException("Invalid or expired token")

    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise UnauthorizedException("Invalid token payload")

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid token payload")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise UnauthorizedException("User not found")
    if not user.is_active:
        raise UnauthorizedException("User account is deactivated")

    return user


def require_permission(permission: Permission):
    """Dependency factory that checks the current user has a specific permission.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_permission(Permission.MANAGE_USERS))])
        async def admin_endpoint(): ...
    """

    def _check(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user.role.value, permission):
            raise ForbiddenException(
                f"Permission '{permission.value}' required"
            )
        return current_user

    return _check

