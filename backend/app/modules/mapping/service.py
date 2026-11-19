"""Column mapping service — rule-based + optional AI mapping."""
from __future__ import annotations
import re
import uuid

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException, ValidationException
from app.models.mapping import ColumnMapping, ColumnMappingTemplate
from app.models.upload import Upload, UploadStatus

# Known aliases → canonical field. Headers are normalised before lookup, so
# ``Order ID``, ``order_id``, ``ORDER-ID`` and ``order id `` all match.
COLUMN_ALIASES: dict[str, str] = {
    # Orders
    "order id": "order_reference", "order no": "order_reference",
    "order no.": "order_reference", "order number": "order_reference",
    "order reference": "order_reference", "order ref": "order_reference",
    "order date": "order_date", "ordered date": "order_date", "date": "order_date",
    "channel": "channel", "marketplace": "channel", "source": "channel",
    "partner": "partner", "partner name": "partner",
    "sku": "sku", "seller sku": "sku", "sku code": "sku",
    "product name": "product_name", "product": "product_name",
    "item name": "product_name", "description": "product_name",
    "quantity": "quantity", "qty": "quantity", "units": "quantity",
    "gross amount": "gross_amount", "gross amt": "gross_amount",
    "total amount": "gross_amount", "order value": "gross_amount",
    "discount": "discount", "discount amount": "discount",
    "net amount": "net_amount", "net amt": "net_amount",
    "net payable": "net_amount", "net sales": "net_amount",
    "payment method": "payment_method", "payment mode": "payment_method",
    "customer city": "customer_city", "city": "customer_city",
    "customer state": "customer_state", "state": "customer_state",
    "status": "status", "order status": "status",
    # Settlements
    "settlement id": "settlement_reference", "settlement reference": "settlement_reference",
    "payout id": "settlement_reference", "payout ref": "settlement_reference",
    "payout reference": "settlement_reference", "payout_ref": "settlement_reference",
    "settlement date": "settlement_date",
    "transaction type": "transaction_type", "type": "transaction_type",
    "settlement amount": "actual_received", "net settlement": "actual_received",
    "settled amount": "actual_received", "amount settled": "actual_received",
    "commission": "commission", "marketplace fee": "commission",
    "commission fee": "commission", "platform fee": "commission",
    "shipping charges": "shipping_fee", "shipping fee": "shipping_fee",
    "shipping charge": "shipping_fee", "freight": "shipping_fee",
    "tcs": "tcs_deducted", "tcs deducted": "tcs_deducted",
    "tds": "tds_deducted", "tds deducted": "tds_deducted",
    "other deductions": "other_fees", "other charges": "other_fees",
    "other fees": "other_fees",
    # COD remittances
    "cod amount": "cod_amount", "cod collected": "cod_amount",
    "remitted amount": "remitted_amount", "amount remitted": "remitted_amount",
    "utr number": "utr_number", "utr": "utr_number", "utr no": "utr_number",
    "remittance date": "remittance_date", "remittance id": "remittance_reference",
    "remittance reference": "remittance_reference",
    # Returns
    "return id": "return_id_reference", "return reference": "return_id_reference",
    "return date": "return_date", "returned date": "return_date",
    "return reason": "return_reason", "reason": "return_reason",
    "return status": "return_status", "refund amount": "refund_amount",
    "refund status": "refund_status", "refund date": "refund_date",
    # Freight
    "invoice id": "invoice_reference", "invoice no": "invoice_reference",
    "invoice no.": "invoice_reference", "invoice number": "invoice_reference",
    "invoice reference": "invoice_reference", "invoice date": "invoice_date",
    "courier partner": "courier_partner", "courier": "courier_partner",
    "awb": "awb_number", "awb number": "awb_number", "awb no": "awb_number",
    "tracking number": "awb_number", "tracking no": "awb_number",
    "origin pincode": "origin_pincode", "origin pin": "origin_pincode",
    "destination pincode": "destination_pincode", "destination pin": "destination_pincode",
    "weight": "actual_weight_kg", "weight (kg)": "actual_weight_kg",
    "actual weight": "actual_weight_kg", "actual weight (kg)": "actual_weight_kg",
    "charged weight": "charged_weight_kg", "charged weight (kg)": "charged_weight_kg",
    "zone": "zone", "rate per kg": "rate_per_kg",
    "freight amount": "freight_amount", "cod charges": "cod_charges",
    "total freight": "total_freight",
    # Warehouse scans
    "scan id": "scan_reference", "scan reference": "scan_reference",
    "scan date": "scan_date", "scan type": "scan_type",
    "location": "location", "warehouse": "location",
}


def normalise_header(column: str) -> str:
    """Canonical lookup key for a source header."""
    normalized = str(column).replace("\ufeff", "").strip().lower()
    normalized = normalized.replace("_", " ").replace("-", " ")
    normalized = normalized.replace("₹", "").replace("rs.", "").replace("inr", "")
    normalized = re.sub(r"\s+", " ", normalized).strip()
    normalized = normalized.rstrip(".")
    return normalized


class MappingService:
    def __init__(self, db: Session):
        self.db = db

    def suggest_mapping(self, upload_id: uuid.UUID) -> dict:
        """Generate mapping suggestions for an uploaded file."""
        upload = self.db.query(Upload).filter(Upload.id == upload_id).first()
        if not upload:
            raise NotFoundException(f"Upload {upload_id} not found")
        if not upload.column_headers:
            raise ValidationException("File has not been parsed yet")

        headers = upload.column_headers.get("columns", [])
        sample_rows = (upload.sample_data or {}).get("rows", [])

        # Build sample values per column (up to 3 rows)
        column_samples: dict[str, list[str]] = {}
        for row in sample_rows:
            for col in headers:
                val = row.get(col)
                if val is not None:
                    column_samples.setdefault(col, []).append(str(val))

        mappings = {}
        for col in headers:
            normalized = normalise_header(col)
            target = COLUMN_ALIASES.get(normalized)
            confidence = 1.0 if target else 0.0
            method = "rule" if target else "unmapped"
            mappings[col] = {
                "target_field": target,
                "confidence": confidence,
                "method": method,
                "sample_values": column_samples.get(col, [])[:3],
            }

        return {"upload_id": str(upload_id), "mappings": mappings}

    def save_mapping(
        self,
        upload_id: uuid.UUID,
        mappings: dict,
        user_id: uuid.UUID,
        approved: bool = False,
        org_id: uuid.UUID | None = None,
    ) -> ColumnMapping:
        upload = self.db.query(Upload).filter(Upload.id == upload_id).first()
        if not upload:
            raise NotFoundException(f"Upload {upload_id} not found")

        # Get latest version
        latest = (
            self.db.query(ColumnMapping)
            .filter(ColumnMapping.upload_id == upload_id)
            .order_by(ColumnMapping.version.desc())
            .first()
        )
        version = (latest.version + 1) if latest else 1

        mapping = ColumnMapping(
            org_id=org_id,
            upload_id=upload_id,
            version=version,
            mappings=mappings,
            is_approved=approved,
            approved_by_id=user_id if approved else None,
            approved_at=datetime.now(timezone.utc) if approved else None,
        )
        self.db.add(mapping)

        if approved:
            upload.status = UploadStatus.MAPPED
            upload.error_message = None

        self.db.commit()
        self.db.refresh(mapping)

        # Approval is the trigger for deterministic normalization. Processing
        # failures are reflected on the upload (status=failed + error_message)
        # without losing the approved mapping the user just saved.
        if approved:
            from app.modules.normalization.service import NormalizationService

            try:
                NormalizationService(self.db).process_upload(
                    upload_id, org_id=org_id or upload.org_id
                )
            except AppException:
                self.db.refresh(mapping)
            except Exception:
                self.db.rollback()
                self.db.refresh(mapping)

        return mapping

    def get_mapping(self, upload_id: uuid.UUID) -> ColumnMapping | None:
        return (
            self.db.query(ColumnMapping)
            .filter(ColumnMapping.upload_id == upload_id)
            .order_by(ColumnMapping.version.desc())
            .first()
        )

