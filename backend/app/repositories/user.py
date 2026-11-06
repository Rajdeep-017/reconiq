"""User repository — data access layer for users."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """Database operations for the User model."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: UUID) -> User | None:
        """Fetch a user by primary key."""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> User | None:
        """Fetch a user by email address (case-insensitive)."""
        return (
            self.db.query(User)
            .filter(func.lower(User.email) == email.lower())
            .first()
        )

    def list_users(
        self, *, offset: int = 0, limit: int = 50, active_only: bool = True
    ) -> tuple[list[User], int]:
        """Return a paginated list of users and total count."""
        query = self.db.query(User)
        if active_only:
            query = query.filter(User.is_active == True)  # noqa: E712

        total = query.count()
        users = (
            query.order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return users, total

    def create(self, user: User) -> User:
        """Insert a new user."""
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        """Persist changes to an existing user."""
        self.db.commit()
        self.db.refresh(user)
        return user

    def email_exists(self, email: str) -> bool:
        """Check if an email is already registered."""
        return self.get_by_email(email) is not None

