"""Partner model — marketplace/logistics partners."""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from sqlalchemy import String, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class Partner(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Represents a marketplace, logistics, or payment partner."""

    __tablename__ = "partners"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    __table_args__ = (
        # Partner name unique per organization
        sa.UniqueConstraint("org_id", "name", name="uq_partners_org_id_name"),
        # Partner code globally unique
        sa.UniqueConstraint("code", name="uq_partners_code"),
    )
    partner_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # marketplace, logistics, payment_gateway, cod_provider
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    settings: Mapped[dict | None] = mapped_column(JSONB, default=dict)

    def __repr__(self) -> str:
        return f"<Partner {self.code} ({self.partner_type}) org_id={self.org_id}>"

