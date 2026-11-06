"""Settlement and COD remittance models — payment entities."""

from __future__ import annotations

import enum
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Date,
    Enum as SAEnum,
    ForeignKey,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class Settlement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Settlement transaction record from a partner.

    One order may have multiple settlement transactions.
    """

    __tablename__ = "settlements"

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

    settlement_reference: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    order_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    settlement_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    transaction_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Financial fields — per spec section 6.3
    gross_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    commission: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    shipping_fee: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    other_fees: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    tcs_deducted: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    tds_deducted: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    expected_net_settlement: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    actual_received: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    difference: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )

    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    upload = relationship("Upload", foreign_keys=[upload_id])
    order = relationship("Order", foreign_keys=[order_id])
    partner = relationship("Partner", foreign_keys=[partner_id])


class CODRemittanceStatus(str, enum.Enum):
    REMITTED = "remitted"
    PENDING = "pending"
    PARTIAL = "partial"


class CODRemittance(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """COD remittance record."""

    __tablename__ = "cod_remittances"

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
        UUID(as_uuid=True), ForeignKey("partners.id"), nullable=True
    )

    remittance_reference: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    order_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    remittance_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    cod_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    remitted_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    utr_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

    status: Mapped[CODRemittanceStatus] = mapped_column(
        SAEnum(CODRemittanceStatus, name="cod_remittance_status", create_constraint=True),
        nullable=False,
        default=CODRemittanceStatus.PENDING,
    )

    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    upload = relationship("Upload", foreign_keys=[upload_id])
    order = relationship("Order", foreign_keys=[order_id])
    partner = relationship("Partner", foreign_keys=[partner_id])

