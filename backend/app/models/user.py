"""User database model."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import String, Boolean, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class UserRole(str, enum.Enum):
    """Application user roles."""

    FINANCE_EXECUTIVE = "finance_executive"
    FINANCE_COFOUNDER = "finance_cofounder"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Represents an authenticated user of the platform."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(1024), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", create_constraint=True),
        nullable=False,
        default=UserRole.FINANCE_EXECUTIVE,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True
    )

    # Relationships
    organization = relationship("Organization", foreign_keys=[org_id])

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role.value} org_id={self.org_id}>"

