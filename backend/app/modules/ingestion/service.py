"""File ingestion service — upload, validate, parse CSV/XLSX files."""
from __future__ import annotations

import hashlib
import os
import uuid
from pathlib import Path

import polars as pl
from sqlalchemy.orm import Session

from app.config import Settings
from app.core.exceptions import ConflictException, ValidationException
from app.models.upload import Upload, UploadStatus, DocumentType, ImportRow


ALLOWED_EXTENSIONS = {"csv", "xlsx"}
ALLOWED_MIMES = {
    "text/csv", "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
}


class IngestionService:
    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    def upload_file(
        self,
        file_content: bytes,
        filename: str,
        document_type: str,
        user_id: uuid.UUID,
        partner_id: uuid.UUID | None = None,
        org_id: uuid.UUID | None = None,
    ) -> Upload:
        """Validate, store and parse an uploaded file."""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise ValidationException(f"Unsupported file type: .{ext}")
        if len(file_content) > self.max_size:
            raise ValidationException(f"File exceeds {self.max_size // (1024*1024)}MB limit")
        if len(file_content) == 0:
            raise ValidationException("File is empty")

        checksum = hashlib.sha256(file_content).hexdigest()

        # Check duplicate within the same organization
        q = self.db.query(Upload).filter(Upload.sha256_checksum == checksum)
        if org_id is not None:
            q = q.filter(Upload.org_id == org_id)
        existing = q.first()
        if existing:
            raise ConflictException(
                "Duplicate file detected",
                details={"existing_upload_id": str(existing.id), "filename": existing.original_filename},
            )

        # Store file
        stored_name = f"{uuid.uuid4().hex}.{ext}"
        file_path = self.upload_dir / stored_name
        file_path.write_bytes(file_content)

        # Create record
        upload = Upload(
            org_id=org_id,
            uploaded_by_id=user_id,
            partner_id=partner_id,
            original_filename=filename,
            stored_filename=stored_name,
            file_type=ext,
            document_type=DocumentType(document_type),
            file_size=len(file_content),
            sha256_checksum=checksum,
            status=UploadStatus.UPLOADED,
        )
        self.db.add(upload)
        self.db.commit()
        self.db.refresh(upload)

        # Parse file
        try:
            self._parse_file(upload, file_path, ext, org_id=org_id)
        except Exception as e:
            upload.status = UploadStatus.VALIDATION_FAILED
            upload.error_message = str(e)[:500]
            self.db.commit()

        return upload

    def _parse_file(
        self,
        upload: Upload,
        file_path: Path,
        ext: str,
        org_id: uuid.UUID | None = None,
    ) -> None:
        """Parse file, extract headers/sample/rows."""
        upload.status = UploadStatus.VALIDATING
        self.db.commit()

        if ext == "csv":
            df = pl.read_csv(file_path, infer_schema_length=0, ignore_errors=True)
        else:
            import openpyxl
            df = pl.read_excel(file_path, engine="openpyxl", infer_schema_length=0)

        headers = df.columns
        row_count = len(df)

        # Sample data (first 10 rows)
        sample_rows = df.head(10).to_dicts()

        upload.column_headers = {"columns": headers, "count": len(headers)}
        upload.sample_data = {"rows": sample_rows, "sample_count": len(sample_rows)}
        upload.row_count = row_count
        upload.status = UploadStatus.VALIDATED
        self.db.commit()

        # Store rows for processing
        rows_to_add = []
        for i, row_dict in enumerate(df.iter_rows(named=True)):
            rows_to_add.append(ImportRow(
                org_id=org_id,
                upload_id=upload.id,
                row_number=i + 1,
                raw_data=dict(row_dict),
            ))
            if len(rows_to_add) >= 1000:
                self.db.bulk_save_objects(rows_to_add)
                self.db.commit()
                rows_to_add = []

        if rows_to_add:
            self.db.bulk_save_objects(rows_to_add)
            self.db.commit()

        upload.status = UploadStatus.MAPPING_PENDING
        self.db.commit()

    def get_upload(self, upload_id: uuid.UUID) -> Upload:
        upload = self.db.query(Upload).filter(Upload.id == upload_id).first()
        if not upload:
            from app.core.exceptions import NotFoundException
            raise NotFoundException(f"Upload {upload_id} not found")
        return upload

    def list_uploads(
        self, page: int = 1, page_size: int = 50, org_id: uuid.UUID | None = None
    ) -> tuple[list[Upload], int]:
        q = self.db.query(Upload)
        if org_id is not None:
            q = q.filter(Upload.org_id == org_id)
        q = q.order_by(Upload.created_at.desc())
        total = q.count()
        uploads = q.offset((page - 1) * page_size).limit(page_size).all()
        return uploads, total
