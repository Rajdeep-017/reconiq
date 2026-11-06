"""Column mapping models — mapping configurations and templates."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class ColumnMapping(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-file column mapping linking source columns to canonical fields."""

    __tablename__ = "column_mappings"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    mappings: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # mappings format: {"source_column": {"target_field": "...", "confidence": 0.95, "method": "rule|ai"}}
    confidence_scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    upload = relationship("Upload", foreign_keys=[upload_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])


class ColumnMappingTemplate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Reusable mapping template per partner and document type."""

    __tablename__ = "column_mapping_templates"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("partners.id"), nullable=True
    )
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    mappings: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    partner = relationship("Partner", foreign_keys=[partner_id])
    organization = relationship("Organization", foreign_keys=[org_id])

