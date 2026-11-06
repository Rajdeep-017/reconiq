"""Role-based permission enforcement."""

from __future__ import annotations

import enum
from collections.abc import Callable
from functools import wraps
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User, UserRole


class Permission(str, enum.Enum):
    """Granular permissions mapped to roles."""

    # Upload & mapping
    UPLOAD_FILES = "upload_files"
    APPROVE_MAPPINGS = "approve_mappings"

    # Reconciliation
    VIEW_RECONCILIATION = "view_reconciliation"
    RUN_RECONCILIATION = "run_reconciliation"

    # Claims
    VIEW_CLAIMS = "view_claims"
    CREATE_CLAIMS = "create_claims"
    APPROVE_CLAIMS = "approve_claims"

    # Dashboard
    VIEW_DASHBOARD = "view_dashboard"
    VIEW_ANALYTICS = "view_analytics"

    # Administration
    MANAGE_PARTNERS = "manage_partners"
    MANAGE_RATE_CARDS = "manage_rate_cards"
    MANAGE_USERS = "manage_users"
    VIEW_AUDIT_LOGS = "view_audit_logs"


# Role → permission mapping
ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "finance_executive": {
        Permission.UPLOAD_FILES,
        Permission.APPROVE_MAPPINGS,
        Permission.VIEW_RECONCILIATION,
        Permission.RUN_RECONCILIATION,
        Permission.VIEW_CLAIMS,
        Permission.CREATE_CLAIMS,
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_ANALYTICS,
        Permission.MANAGE_PARTNERS,
        Permission.MANAGE_RATE_CARDS,
    },
    "finance_cofounder": {
        Permission.UPLOAD_FILES,
        Permission.APPROVE_MAPPINGS,
        Permission.VIEW_RECONCILIATION,
        Permission.RUN_RECONCILIATION,
        Permission.VIEW_CLAIMS,
        Permission.CREATE_CLAIMS,
        Permission.APPROVE_CLAIMS,
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_ANALYTICS,
        Permission.MANAGE_PARTNERS,
        Permission.MANAGE_RATE_CARDS,
        Permission.MANAGE_USERS,
        Permission.VIEW_AUDIT_LOGS,
    },
}


def get_user_permissions(role: str) -> set[Permission]:
    """Get all permissions for a given role."""
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(role: str, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    return permission in get_user_permissions(role)


def require_role(*allowed_roles: str) -> Callable:
    """Decorator to enforce role-based access on service methods.

    Usage:
        @require_role("finance_cofounder")
        def approve_claim(self, user: User, claim_id: UUID): ...
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Look for 'current_user' in kwargs or second positional arg
            user = kwargs.get("current_user")
            if user is None and len(args) > 1:
                user = args[1]
            if user is None:
                from app.core.exceptions import UnauthorizedException

                raise UnauthorizedException("Authentication required")
            if user.role.value not in allowed_roles:
                from app.core.exceptions import ForbiddenException

                raise ForbiddenException(
                    f"Role '{user.role.value}' is not authorized for this action"
                )
            return func(*args, **kwargs)

        return wrapper

    return decorator

