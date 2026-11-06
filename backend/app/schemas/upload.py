"""Upload schemas."""
from __future__ import annotations
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    id: UUID
    original_filename: str
    stored_filename: str
    file_type: str
    document_type: str
    file_size: int
    sha256_checksum: str
    row_count: int | None
    column_headers: dict | None
    sample_data: dict | None
    status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class UploadListResponse(BaseModel):
    uploads: list[UploadResponse]
    total: int
    page: int
    page_size: int

