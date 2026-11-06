"""Discrepancy and Claims models."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class DiscrepancyType(str, enum.Enum):
    SHORT_PAYMENT = "short_payment"
    MISSING_SETTLEMENT = "missing_settlement"
    UNPAID_ORDER = "unpaid_order"
    MISSING_COD_REMITTANCE = "missing_cod_remittance"
    FREIGHT_OVERCHARGE = "freight_overcharge"
    INCORRECT_FREIGHT_WEIGHT = "incorrect_freight_weight"
    INCORRECT_FREIGHT_ZONE = "incorrect_freight_zone"
    RETURN_REFUND_MISMATCH = "return_refund_mismatch"
    DUPLICATE_DEDUCTION = "duplicate_deduction"
    EXCESS_PAYMENT = "excess_payment"
    OTHER = "other"


class DiscrepancySeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DiscrepancyStatus(str, enum.Enum):
    DETECTED = "detected"
    VERIFIED = "verified"
    DISPUTED = "disputed"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class Discrepancy(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Financial discrepancy detected during reconciliation."""

    __tablename__ = "discrepancies"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reconciliation_runs.id"), nullable=False, index=True
    )
    result_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reconciliation_results.id"),
        nullable=True,
        index=True,
    )
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("partners.id"), nullable=True, index=True
    )

    order_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    discrepancy_type: Mapped[DiscrepancyType] = mapped_column(
        SAEnum(DiscrepancyType, name="discrepancy_type", create_constraint=True),
        nullable=False,
    )
    severity: Mapped[DiscrepancySeverity] = mapped_column(
        SAEnum(DiscrepancySeverity, name="discrepancy_severity", create_constraint=True),
        nullable=False,
        default=DiscrepancySeverity.MEDIUM,
    )
    status: Mapped[DiscrepancyStatus] = mapped_column(
        SAEnum(DiscrepancyStatus, name="discrepancy_status", create_constraint=True),
        nullable=False,
        default=DiscrepancyStatus.DETECTED,
    )

    expected_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    actual_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    difference_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )

    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    metadata_extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    run = relationship("ReconciliationRun", foreign_keys=[run_id])
    result = relationship("ReconciliationResult", foreign_keys=[result_id])
    partner = relationship("Partner", foreign_keys=[partner_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])


# ---------- Claims ----------


class ClaimStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    ACKNOWLEDGED = "acknowledged"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"
    CLOSED = "closed"


class Claim(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A financial claim generated from a confirmed discrepancy."""

    __tablename__ = "claims"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    discrepancy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("discrepancies.id"), nullable=False, index=True
    )
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("partners.id"), nullable=True, index=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    claim_reference: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    claim_type: Mapped[str] = mapped_column(String(50), nullable=False)
    claim_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False
    )
    recovered_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    status: Mapped[ClaimStatus] = mapped_column(
        SAEnum(ClaimStatus, name="claim_status", create_constraint=True),
        nullable=False,
        default=ClaimStatus.DRAFT,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    metadata_extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    discrepancy = relationship("Discrepancy", foreign_keys=[discrepancy_id])
    partner = relationship("Partner", foreign_keys=[partner_id])
    created_by = relationship("User", foreign_keys=[created_by_id])


class ClaimEvidence(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Immutable evidence snapshot attached to a claim."""

    __tablename__ = "claim_evidence"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("claims.id"), nullable=False, index=True
    )
    evidence_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # order_snapshot, settlement_snapshot, screenshot, document
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    snapshot_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    claim = relationship("Claim", foreign_keys=[claim_id])

