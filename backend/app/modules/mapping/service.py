"""Column mapping service — rule-based + optional AI mapping."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundException, ValidationException
from app.models.mapping import ColumnMapping, ColumnMappingTemplate
from app.models.upload import Upload, UploadStatus

# Known aliases → canonical field
COLUMN_ALIASES: dict[str, str] = {
    "order id": "order_reference", "order_id": "order_reference",
    "order no": "order_reference", "order number": "order_reference",
    "order reference": "order_reference", "order ref": "order_reference",
    "order date": "order_date", "date": "order_date",
    "awb": "awb_number", "awb number": "awb_number", "tracking number": "awb_number",
    "net amount": "net_amount", "net amt": "net_amount",
    "gross amount": "gross_amount", "gross amt": "gross_amount", "total amount": "gross_amount",
    "settlement amount": "actual_received", "net settlement": "actual_received",
    "commission": "commission", "marketplace fee": "commission",
    "shipping charges": "shipping_fee", "shipping fee": "shipping_fee",
    "shipping charge": "shipping_fee", "freight": "shipping_fee",
    "tcs": "tcs_deducted", "tds": "tds_deducted",
    "other deductions": "other_fees", "other charges": "other_fees",
    "discount": "discount", "quantity": "quantity", "qty": "quantity",
    "sku": "sku", "product name": "product_name", "product": "product_name",
    "payment method": "payment_method", "payment mode": "payment_method",
    "status": "status", "order status": "status",
    "partner": "partner", "channel": "channel",
    "customer city": "customer_city", "city": "customer_city",
    "customer state": "customer_state", "state": "customer_state",
    "settlement id": "settlement_reference", "settlement date": "settlement_date",
    "transaction type": "transaction_type",
    "cod amount": "cod_amount", "remitted amount": "remitted_amount",
    "utr number": "utr_number", "utr": "utr_number",
    "remittance date": "remittance_date", "remittance id": "remittance_reference",
    "return id": "return_id_reference", "return date": "return_date",
    "return reason": "return_reason", "return status": "return_status",
    "refund amount": "refund_amount", "refund status": "refund_status",
    "refund date": "refund_date",
    "invoice id": "invoice_reference", "invoice date": "invoice_date",
    "courier partner": "courier_partner",
    "origin pincode": "origin_pincode", "destination pincode": "destination_pincode",
    "weight": "actual_weight_kg", "weight (kg)": "actual_weight_kg",
    "charged weight": "charged_weight_kg", "charged weight (kg)": "charged_weight_kg",
    "zone": "zone", "rate per kg": "rate_per_kg",
    "freight amount": "freight_amount", "cod charges": "cod_charges",
    "total freight": "total_freight",
}


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
        mappings = {}
        for col in headers:
            normalized = col.strip().lower().replace("_", " ").replace("-", " ")
            target = COLUMN_ALIASES.get(normalized)
            confidence = 1.0 if target else 0.0
            method = "rule" if target else "unmapped"
            mappings[col] = {
                "target_field": target,
                "confidence": confidence,
                "method": method,
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
            upload.status = UploadStatus.MAPPING_APPROVED

        self.db.commit()
        self.db.refresh(mapping)
        return mapping

    def get_mapping(self, upload_id: uuid.UUID) -> ColumnMapping | None:
        return (
            self.db.query(ColumnMapping)
            .filter(ColumnMapping.upload_id == upload_id)
            .order_by(ColumnMapping.version.desc())
            .first()
        )

