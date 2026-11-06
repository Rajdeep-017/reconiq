"""Reconciliation models — runs, results, match suggestions."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
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


class ReconStatus(str, enum.Enum):
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ReconType(str, enum.Enum):
    SETTLEMENT = "settlement"
    FREIGHT = "freight"
    COD = "cod"
    RETURN = "return"


class ReconciliationRun(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A single reconciliation execution."""

    __tablename__ = "reconciliation_runs"

    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    recon_type: Mapped[ReconType] = mapped_column(
        SAEnum(ReconType, name="recon_type", create_constraint=True),
        nullable=False,
    )
    source_upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=False
    )
    target_upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=False
    )
    status: Mapped[ReconStatus] = mapped_column(
        SAEnum(ReconStatus, name="recon_status", create_constraint=True),
        nullable=False,
        default=ReconStatus.CREATED,
    )
    config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Statistics
    total_source: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_target: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    matched_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unmatched_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    discrepancy_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    total_expected: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    total_received: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    total_discrepancy: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    source_upload = relationship("Upload", foreign_keys=[source_upload_id])
    target_upload = relationship("Upload", foreign_keys=[target_upload_id])


class MatchMethod(str, enum.Enum):
    EXACT = "exact"
    COMPOSITE = "composite"
    FUZZY = "fuzzy"
    AI_ASSISTED = "ai_assisted"
    MANUAL = "manual"


class MatchStatus(str, enum.Enum):
    MATCHED = "matched"
    PARTIAL = "partial"
    UNMATCHED = "unmatched"
    REVIEW_PENDING = "review_pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class ReconciliationResult(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Individual match result from a reconciliation run."""

    __tablename__ = "reconciliation_results"

    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reconciliation_runs.id"), nullable=False, index=True
    )
    order_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    source_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    target_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    match_method: Mapped[MatchMethod] = mapped_column(
        SAEnum(MatchMethod, name="match_method", create_constraint=True),
        nullable=False,
    )
    match_status: Mapped[MatchStatus] = mapped_column(
        SAEnum(MatchStatus, name="match_status", create_constraint=True),
        nullable=False,
    )
    confidence_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), nullable=False, default=Decimal("0")
    )

    expected_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    actual_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )
    difference: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=Decimal("0")
    )

    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    run = relationship("ReconciliationRun", foreign_keys=[run_id])


class MatchSuggestion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """AI-generated match suggestions for human review."""

    __tablename__ = "match_suggestions"

    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reconciliation_runs.id"), nullable=False, index=True
    )
    source_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    candidate_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    confidence_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), nullable=False
    )
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_accepted: Mapped[bool | None] = mapped_column(nullable=True)  # None = pending
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

