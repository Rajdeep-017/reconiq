"""Order and Return models — commerce entities."""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class OrderStatus(str, enum.Enum):
    DELIVERED = "delivered"
    RETURNED = "returned"
    CANCELLED = "cancelled"
    SHIPPED = "shipped"
    PENDING = "pending"
    RTO = "rto"


class Order(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Normalized order record."""

    __tablename__ = "orders"

    upload_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=True, index=True
    )
    import_row_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_rows.id"), nullable=True
    )
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("partners.id"), nullable=True, index=True
    )

    # Order identification — partner-aware, not assumed globally unique
    order_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    channel: Mapped[str | None] = mapped_column(String(100), nullable=True)
    order_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    # Product details
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    product_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Financial fields — all NUMERIC, never float
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    discount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    net_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    customer_state: Mapped[str | None] = mapped_column(String(100), nullable=True)

    status: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus, name="order_status", create_constraint=True),
        nullable=False,
        default=OrderStatus.PENDING,
    )

    # Preserve original data for audit
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    dedup_hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )

    # Relationships
    upload = relationship("Upload", foreign_keys=[upload_id])
    partner = relationship("Partner", foreign_keys=[partner_id])


class ReturnStatus(str, enum.Enum):
    RECEIVED = "received"
    IN_TRANSIT = "in_transit"
    QC_PASSED = "qc_passed"
    QC_FAILED = "qc_failed"
    PENDING = "pending"


class RefundStatus(str, enum.Enum):
    PROCESSED = "processed"
    PENDING = "pending"
    FAILED = "failed"


class Return(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Return/refund record linked to an order."""

    __tablename__ = "returns"

    upload_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=True, index=True
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True, index=True
    )
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("partners.id"), nullable=True
    )

    return_id_reference: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    order_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    return_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    return_status: Mapped[ReturnStatus] = mapped_column(
        SAEnum(ReturnStatus, name="return_status_enum", create_constraint=True),
        nullable=False,
        default=ReturnStatus.PENDING,
    )

    refund_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    refund_status: Mapped[RefundStatus] = mapped_column(
        SAEnum(RefundStatus, name="refund_status_enum", create_constraint=True),
        nullable=False,
        default=RefundStatus.PENDING,
    )
    refund_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    upload = relationship("Upload", foreign_keys=[upload_id])
    order = relationship("Order", foreign_keys=[order_id])
    partner = relationship("Partner", foreign_keys=[partner_id])

