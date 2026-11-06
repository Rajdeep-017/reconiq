"""Upload-related models — file uploads and import rows."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class UploadStatus(str, enum.Enum):
    """File processing status lifecycle."""

    UPLOADED = "uploaded"
    VALIDATING = "validating"
    VALIDATED = "validated"
    MAPPING_PENDING = "mapping_pending"
    MAPPING_APPROVED = "mapping_approved"
    PROCESSING = "processing"
    RECONCILING = "reconciling"
    COMPLETED = "completed"
    # Failure states
    VALIDATION_FAILED = "validation_failed"
    MAPPING_FAILED = "mapping_failed"
    PROCESSING_FAILED = "processing_failed"
    RECONCILIATION_FAILED = "reconciliation_failed"


class DocumentType(str, enum.Enum):
    """Types of financial documents."""

    ORDERS = "orders"
    SETTLEMENTS = "settlements"
    FREIGHT_INVOICES = "freight_invoices"
    COD_REMITTANCES = "cod_remittances"
    RETURNS = "returns"


class Upload(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Metadata for an uploaded file."""

    __tablename__ = "uploads"

    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("partners.id"), nullable=True
    )
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # csv, xlsx
    document_type: Mapped[DocumentType] = mapped_column(
        SAEnum(DocumentType, name="document_type", create_constraint=True),
        nullable=False,
    )
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256_checksum: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    column_headers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    sample_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[UploadStatus] = mapped_column(
        SAEnum(UploadStatus, name="upload_status", create_constraint=True),
        nullable=False,
        default=UploadStatus.UPLOADED,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    partner = relationship("Partner", foreign_keys=[partner_id])

    def __repr__(self) -> str:
        return f"<Upload {self.original_filename} ({self.status.value})>"


class ImportRow(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Individual rows from an uploaded file, preserving raw data."""

    __tablename__ = "import_rows"

    upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=False, index=True
    )
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    validation_errors: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    upload = relationship("Upload", foreign_keys=[upload_id])

