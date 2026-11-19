"""File ingestion service — upload, validate, parse CSV/XLSX files."""
from __future__ import annotations

import csv
import hashlib
import math
import os
import uuid
from datetime import date, datetime
from decimal import Decimal
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

DOCUMENT_TYPE_ALIASES = {
    "order": "orders",
    "settlement": "settlements",
    "settlement_report": "settlements",
    "freight": "freight_invoices",
    "freight_invoice": "freight_invoices",
    "freight_records": "freight_invoices",
    "cod": "cod_remittances",
    "cod_remittance": "cod_remittances",
    "return": "returns",
    "scan": "warehouse_scans",
    "scans": "warehouse_scans",
    "warehouse_scan": "warehouse_scans",
}

MAX_RAW_STRING = 10_000


def _json_safe(value):
    """Make parsed cell values JSONB-safe while preserving their meaning."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, str):
        return value[:MAX_RAW_STRING]
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def _detect_delimiter(file_path: Path) -> str:
    """Detect comma/semicolon/tab separated files (QC2 exports use ``;``)."""
    head = file_path.read_bytes()[:65536]
    text = head.decode("utf-8-sig", errors="replace")
    lines = [line for line in text.splitlines() if line.strip()][:5]
    if not lines:
        return ","
    sample = "\n".join(lines)
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
    except csv.Error:
        counts = {d: lines[0].count(d) for d in (",", ";", "\t", "|")}
        best = max(counts, key=counts.get)
        return best if counts[best] > 0 else ","



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

        normalized_type = DOCUMENT_TYPE_ALIASES.get(
            document_type.strip().lower(), document_type.strip().lower()
        )
        try:
            parsed_document_type = DocumentType(normalized_type)
        except ValueError:
            raise ValidationException(f"Unsupported document type: {document_type}")

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
            document_type=parsed_document_type,
            file_size=len(file_content),
            sha256_checksum=checksum,
            status=UploadStatus.UPLOADED,
        )
        self.db.add(upload)
        self.db.commit()
        self.db.refresh(upload)

        # Parse file
        upload_id = upload.id
        try:
            self._parse_file(upload, file_path, ext, org_id=org_id)
        except Exception as e:
            self.db.rollback()
            failed = self.db.query(Upload).filter(Upload.id == upload_id).first()
            if failed is not None:
                failed.status = UploadStatus.FAILED
                failed.error_message = str(e)[:500]
                self.db.commit()

        return upload

    def _parse_file(
        self,
        upload: Upload,
        file_path: Path,
        ext: str,
        org_id: uuid.UUID | None = None,
    ) -> None:
        """Read the full file and persist every raw row for normalization."""
        if ext == "csv":
            delimiter = _detect_delimiter(file_path)
            df = pl.read_csv(
                file_path,
                separator=delimiter,
                infer_schema_length=0,
                ignore_errors=True,
                encoding="utf8-lossy",
            )
        else:
            df = pl.read_excel(file_path, engine="openpyxl", infer_schema_length=0)

        # JSONB requires string keys; xlsx headers may be non-string in rare files.
        original_columns = list(df.columns)
        string_columns = [str(column) for column in original_columns]
        if string_columns != original_columns:
            df = df.rename(dict(zip(original_columns, string_columns)))

        headers = string_columns
        row_count = len(df)

        # Sample data (first 10 rows) — JSON-safe for datetime/Decimal cells.
        sample_rows = [
            {key: _json_safe(value) for key, value in row.items()}
            for row in df.head(10).to_dicts()
        ]

        upload.column_headers = {"columns": headers, "count": len(headers)}
        upload.sample_data = {"rows": sample_rows, "sample_count": len(sample_rows)}
        upload.row_count = row_count
        upload.error_message = None
        self.db.commit()

        # Store every row for processing. Preserve the raw file values.
        rows_to_add = []
        for i, row_dict in enumerate(df.iter_rows(named=True)):
            rows_to_add.append(ImportRow(
                org_id=org_id,
                upload_id=upload.id,
                row_number=i + 1,
                raw_data={key: _json_safe(value) for key, value in row_dict.items()},
            ))
            if len(rows_to_add) >= 1000:
                self.db.bulk_save_objects(rows_to_add)
                self.db.commit()
                rows_to_add = []

        if rows_to_add:
            self.db.bulk_save_objects(rows_to_add)
            self.db.commit()

        upload.status = UploadStatus.PARSED
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
