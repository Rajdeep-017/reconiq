"""User management service."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ConflictException, ForbiddenException
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.schemas.user import UserUpdateRequest, UserRoleUpdateRequest


class UserService:
    """Business logic for user management operations."""

    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def get_user(self, user_id: UUID, org_id: UUID | None = None) -> User:
        """Get a single user by ID, optionally scoped to an organization."""
        user = self.repo.get_by_id(user_id, org_id=org_id)
        if user is None:
            raise NotFoundException(f"User {user_id} not found")
        return user

    def list_users(
        self,
        org_id: UUID | None = None,
        *,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[User], int]:
        """List users with pagination, optionally scoped to an organization."""
        offset = (page - 1) * page_size
        return self.repo.list_users(org_id=org_id, offset=offset, limit=page_size)

    def update_profile(
        self, user: User, data: UserUpdateRequest
    ) -> User:
        """Update the current user's profile."""
        if data.full_name is not None:
            user.full_name = data.full_name
        if data.email is not None:
            existing = self.repo.get_by_email(data.email)
            if existing and existing.id != user.id:
                raise ConflictException("Email already in use")
            user.email = data.email.lower()
        return self.repo.update(user)

    def update_role(
        self,
        target_user_id: UUID,
        data: UserRoleUpdateRequest,
        current_user: User,
    ) -> User:
        """Change a user's role. Only finance_cofounder can do this."""
        if current_user.role != UserRole.FINANCE_COFOUNDER:
            raise ForbiddenException("Only finance co-founders can change roles")
        if target_user_id == current_user.id:
            raise ForbiddenException("Cannot change your own role")

        target = self.get_user(target_user_id)
        target.role = UserRole(data.role)
        return self.repo.update(target)

    def deactivate_user(
        self, target_user_id: UUID, current_user: User
    ) -> User:
        """Deactivate a user account."""
        if current_user.role != UserRole.FINANCE_COFOUNDER:
            raise ForbiddenException("Only finance co-founders can deactivate users")
        if target_user_id == current_user.id:
            raise ForbiddenException("Cannot deactivate yourself")

        target = self.get_user(target_user_id)
        target.is_active = False
        return self.repo.update(target)
