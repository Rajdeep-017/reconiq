"""Partner model — marketplace/logistics partners."""

from __future__ import annotations

from sqlalchemy import String, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class Partner(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Represents a marketplace, logistics, or payment partner."""

    __tablename__ = "partners"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    code: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True
    )
    partner_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # marketplace, logistics, payment_gateway, cod_provider
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    settings: Mapped[dict | None] = mapped_column(JSONB, default=dict)

    def __repr__(self) -> str:
        return f"<Partner {self.code} ({self.partner_type})>"

