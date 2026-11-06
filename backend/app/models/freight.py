"""Freight and rate card models — logistics entities."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class FreightRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Freight invoice record from a courier partner."""

    __tablename__ = "freight_records"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    upload_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=True, index=True
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True, index=True
    )
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("partners.id"), nullable=True, index=True
    )

    invoice_reference: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    order_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    awb_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True
    )
    invoice_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    origin_pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    destination_pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    zone: Mapped[str | None] = mapped_column(String(10), nullable=True)

    actual_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False, default=Decimal("0")
    )
    charged_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False, default=Decimal("0")
    )
    rate_per_kg: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0")
    )

    freight_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    cod_charges: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    total_freight: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )

    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    upload = relationship("Upload", foreign_keys=[upload_id])
    order = relationship("Order", foreign_keys=[order_id])
    partner = relationship("Partner", foreign_keys=[partner_id])


class RateCard(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Partner rate card with effective date ranges."""

    __tablename__ = "rate_cards"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    partner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("partners.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    zone: Mapped[str] = mapped_column(String(10), nullable=False)
    weight_slab_min_kg: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False
    )
    weight_slab_max_kg: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False
    )
    rate_per_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    fixed_charge: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0")
    )
    cod_charge_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0")
    )
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Relationships
    partner = relationship("Partner", foreign_keys=[partner_id])

