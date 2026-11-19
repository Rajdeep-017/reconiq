"""Deterministic normalization: ImportRow.raw_data -> typed financial tables.

The service applies the latest approved column mapping, normalizes values,
routes by document type, preserves the raw row, records row-level rejection
reasons, and deduplicates using natural financial keys.

Idempotency contract:
* Re-processing the same upload first deletes that upload's previously
  normalized rows, then re-inserts them.
* Rows already present from other uploads are skipped using natural keys
  (settlement payout reference, COD UTR, freight invoice+AWB, etc.).
"""
from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.models.freight import FreightRecord
from app.models.mapping import ColumnMapping
from app.models.order import (
    Order,
    OrderStatus,
    RefundStatus,
    Return,
    ReturnStatus,
    WarehouseScan,
)
from app.models.partner import Partner
from app.models.settlement import CODRemittance, CODRemittanceStatus, Settlement
from app.models.upload import DocumentType, ImportRow, Upload, UploadStatus
from app.modules.normalization.values import (
    clean_text,
    is_blank,
    map_enum,
    normalize_id,
    parse_date,
    parse_decimal,
    parse_int,
)

ZERO = Decimal("0")
BATCH_SIZE = 1000


ORDER_STATUS_MAP = {
    "delivered": OrderStatus.DELIVERED,
    "returned": OrderStatus.RETURNED,
    "cancelled": OrderStatus.CANCELLED,
    "canceled": OrderStatus.CANCELLED,
    "shipped": OrderStatus.SHIPPED,
    "pending": OrderStatus.PENDING,
    "rto": OrderStatus.RTO,
    "in_transit": OrderStatus.SHIPPED,
    "out_for_delivery": OrderStatus.SHIPPED,
}

RETURN_STATUS_MAP = {
    "received": ReturnStatus.RECEIVED,
    "in_transit": ReturnStatus.IN_TRANSIT,
    "qc_passed": ReturnStatus.QC_PASSED,
    "qc_failed": ReturnStatus.QC_FAILED,
    "pending": ReturnStatus.PENDING,
    "returned": ReturnStatus.RECEIVED,
}

REFUND_STATUS_MAP = {
    "processed": RefundStatus.PROCESSED,
    "pending": RefundStatus.PENDING,
    "failed": RefundStatus.FAILED,
}

COD_STATUS_MAP = {
    "remitted": CODRemittanceStatus.REMITTED,
    "pending": CODRemittanceStatus.PENDING,
    "partial": CODRemittanceStatus.PARTIAL,
    "partially_remitted": CODRemittanceStatus.PARTIAL,
}

REQUIRED_FIELDS: dict[DocumentType, set[str]] = {
    DocumentType.ORDERS: {"order_reference"},
    DocumentType.SETTLEMENTS: {"order_reference"},
    DocumentType.COD_REMITTANCES: {"order_reference"},
    DocumentType.FREIGHT_INVOICES: {"order_reference"},
    DocumentType.RETURNS: {"order_reference"},
    DocumentType.WAREHOUSE_SCANS: {"order_reference"},
}


@dataclass
class NormalizationStats:
    total_rows: int = 0
    processed: int = 0
    rejected: int = 0
    duplicates: int = 0


def _target_to_source(mappings: dict) -> dict[str, str]:
    """Accept both API shapes: ``{src: target}`` and ``{src: {target_field}}``."""
    result: dict[str, str] = {}
    for source, value in (mappings or {}).items():
        target = None
        if isinstance(value, str):
            target = value
        elif isinstance(value, dict):
            target = value.get("target_field") or value.get("target")
        if target:
            result[str(target)] = str(source)
    return result


def _value(raw: dict, target_to_source: dict[str, str], field: str):
    source = target_to_source.get(field)
    if source is None:
        return None
    return raw.get(source)


def _synthetic(prefix: str, upload: Upload, row_number: int) -> str:
    return f"{prefix}-{str(upload.id)[:8].upper()}-{row_number}"


class NormalizationService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------ API
    def process_upload(
        self, upload_id: uuid.UUID, org_id: uuid.UUID | None = None
    ) -> Upload:
        upload = self.db.query(Upload).filter(Upload.id == upload_id).first()
        if not upload:
            raise NotFoundException(f"Upload {upload_id} not found")
        if org_id is not None and upload.org_id != org_id:
            raise ForbiddenException("Access denied: upload belongs to a different organization")

        mapping = (
            self.db.query(ColumnMapping)
            .filter(ColumnMapping.upload_id == upload_id)
            .filter(ColumnMapping.is_approved.is_(True))
            .order_by(ColumnMapping.version.desc())
            .first()
        )
        if mapping is None:
            raise ValidationException(
                "No approved column mapping found. Approve a mapping before processing."
            )

        target_to_source = _target_to_source(mapping.mappings)
        missing = sorted(REQUIRED_FIELDS.get(upload.document_type, set()) - target_to_source.keys())
        if missing:
            upload.status = UploadStatus.FAILED
            upload.error_message = f"Required fields are not mapped: {', '.join(missing)}"
            self.db.commit()
            raise ValidationException(upload.error_message)

        upload.status = UploadStatus.PROCESSING
        upload.error_message = None
        upload.processed_count = 0
        upload.rejected_count = 0
        upload.duplicate_count = 0
        self.db.commit()

        try:
            self._delete_previous(upload)
            stats = self._normalize(upload, target_to_source)
            upload.processed_count = stats.processed
            upload.rejected_count = stats.rejected
            upload.duplicate_count = stats.duplicates
            upload.status = UploadStatus.PROCESSED
            upload.error_message = None
            self.db.commit()
            self.db.refresh(upload)
            return upload
        except Exception as exc:  # noqa: BLE001 - status must reflect any failure
            self.db.rollback()
            failed = self.db.query(Upload).filter(Upload.id == upload_id).first()
            if failed is not None:
                failed.status = UploadStatus.FAILED
                failed.error_message = str(exc)[:500]
                self.db.commit()
            raise

    # ------------------------------------------------------------ internals
    def _delete_previous(self, upload: Upload) -> None:
        model = self._model_for(upload.document_type)
        self.db.execute(delete(model).where(model.upload_id == upload.id))
        self.db.execute(
            update(ImportRow)
            .where(ImportRow.upload_id == upload.id)
            .values(is_processed=False, is_valid=True, validation_errors=None)
        )
        self.db.commit()

    def _model_for(self, document_type: DocumentType):
        return {
            DocumentType.ORDERS: Order,
            DocumentType.SETTLEMENTS: Settlement,
            DocumentType.COD_REMITTANCES: CODRemittance,
            DocumentType.FREIGHT_INVOICES: FreightRecord,
            DocumentType.RETURNS: Return,
            DocumentType.WAREHOUSE_SCANS: WarehouseScan,
        }[document_type]

    def _normalize(self, upload: Upload, target_to_source: dict[str, str]) -> NormalizationStats:
        stats = NormalizationStats(total_rows=upload.row_count or 0)
        partner_lookup = self._partner_lookup(upload.org_id)
        existing_keys = self._existing_keys(upload)
        seen_keys: set[tuple] = set()

        builder = {
            DocumentType.ORDERS: self._build_order,
            DocumentType.SETTLEMENTS: self._build_settlement,
            DocumentType.COD_REMITTANCES: self._build_cod_remittance,
            DocumentType.FREIGHT_INVOICES: self._build_freight,
            DocumentType.RETURNS: self._build_return,
            DocumentType.WAREHOUSE_SCANS: self._build_scan,
        }[upload.document_type]

        pending_objects: list = []
        pending_updates: list[dict] = []

        rows = (
            self.db.query(ImportRow)
            .filter(ImportRow.upload_id == upload.id)
            .order_by(ImportRow.row_number)
            .yield_per(BATCH_SIZE)
        )
        for row in rows:
            raw = row.raw_data or {}
            obj, key, errors = builder(
                upload, raw, target_to_source, partner_lookup, row.row_number
            )

            if errors:
                stats.rejected += 1
                pending_updates.append(
                    {
                        "id": row.id,
                        "is_processed": True,
                        "is_valid": False,
                        "validation_errors": {"errors": errors},
                    }
                )
            elif key is not None and (key in existing_keys or key in seen_keys):
                stats.duplicates += 1
                pending_updates.append(
                    {
                        "id": row.id,
                        "is_processed": True,
                        "is_valid": True,
                        "validation_errors": None,
                    }
                )
            else:
                if key is not None:
                    seen_keys.add(key)
                pending_objects.append(obj)
                stats.processed += 1
                pending_updates.append(
                    {
                        "id": row.id,
                        "is_processed": True,
                        "is_valid": True,
                        "validation_errors": None,
                    }
                )

            if len(pending_objects) >= BATCH_SIZE:
                self.db.bulk_save_objects(pending_objects)
                pending_objects = []
            if len(pending_updates) >= BATCH_SIZE:
                self.db.bulk_update_mappings(ImportRow, pending_updates)
                pending_updates = []

        if pending_objects:
            self.db.bulk_save_objects(pending_objects)
        if pending_updates:
            self.db.bulk_update_mappings(ImportRow, pending_updates)

        self.db.flush()
        return stats

    def _partner_lookup(self, org_id: uuid.UUID) -> dict[str, uuid.UUID]:
        lookup: dict[str, uuid.UUID] = {}
        partners = self.db.query(Partner).filter(Partner.org_id == org_id).all()
        for partner in partners:
            lookup[partner.name.strip().lower()] = partner.id
            lookup[partner.code.strip().lower()] = partner.id
        return lookup

    def _resolve_partner(
        self,
        upload: Upload,
        raw: dict,
        target_to_source: dict[str, str],
        lookup: dict[str, uuid.UUID],
    ) -> uuid.UUID | None:
        if upload.partner_id:
            return upload.partner_id
        name = normalize_id(
            _value(raw, target_to_source, "partner")
            or _value(raw, target_to_source, "courier_partner")
        )
        if not name:
            return None
        return lookup.get(name.lower())

    def _existing_keys(self, upload: Upload) -> set[tuple]:
        org = upload.org_id
        other_upload = self._model_for(upload.document_type).upload_id != upload.id
        if upload.document_type == DocumentType.ORDERS:
            rows = self.db.execute(
                select(Order.order_reference, Order.sku, Order.partner_id).where(
                    Order.org_id == org, other_upload
                )
            ).all()
            return {(r[0], r[1] or "", str(r[2] or "")) for r in rows}
        if upload.document_type == DocumentType.SETTLEMENTS:
            rows = self.db.execute(
                select(Settlement.settlement_reference, Settlement.order_reference).where(
                    Settlement.org_id == org, other_upload
                )
            ).all()
            return {(r[0], r[1]) for r in rows}
        if upload.document_type == DocumentType.COD_REMITTANCES:
            rows = self.db.execute(
                select(
                    CODRemittance.utr_number,
                    CODRemittance.remittance_reference,
                    CODRemittance.order_reference,
                ).where(CODRemittance.org_id == org, other_upload)
            ).all()
            return {((r[0] or r[1]), r[2]) for r in rows}
        if upload.document_type == DocumentType.FREIGHT_INVOICES:
            rows = self.db.execute(
                select(FreightRecord.invoice_reference, FreightRecord.awb_number).where(
                    FreightRecord.org_id == org, other_upload
                )
            ).all()
            return {(r[0], r[1] or "") for r in rows}
        if upload.document_type == DocumentType.RETURNS:
            rows = self.db.execute(
                select(Return.return_id_reference, Return.order_reference).where(
                    Return.org_id == org, other_upload
                )
            ).all()
            return {(r[0], r[1]) for r in rows}
        rows = self.db.execute(
            select(WarehouseScan.scan_reference).where(
                WarehouseScan.org_id == org, other_upload
            )
        ).all()
        return {(r[0],) for r in rows}

    # ------------------------------------------------------------- builders
    def _build_order(self, upload, raw, tmap, lookup, row_number):
        errors: list[str] = []
        order_reference = normalize_id(_value(raw, tmap, "order_reference"))
        if not order_reference:
            errors.append("missing_order_reference")

        date_valid, order_date = self._optional_date(raw, tmap, "order_date", errors)
        gross = parse_decimal(_value(raw, tmap, "gross_amount"))
        discount = parse_decimal(_value(raw, tmap, "discount")) or ZERO
        net = parse_decimal(_value(raw, tmap, "net_amount"))
        if net is None and gross is not None:
            net = gross - discount
        if gross is None and net is not None:
            gross = net + discount
        if net is None:
            errors.append("missing_amount")
        if errors:
            return None, None, errors

        quantity = parse_int(_value(raw, tmap, "quantity"))
        if quantity is None or quantity < 1:
            quantity = 1
        status = map_enum(
            _value(raw, tmap, "status"), ORDER_STATUS_MAP, OrderStatus.PENDING
        )
        partner_id = self._resolve_partner(upload, raw, tmap, lookup)
        sku = normalize_id(_value(raw, tmap, "sku"))
        dedup_hash = hashlib.sha256(
            f"{upload.org_id}|{partner_id or ''}|{order_reference}|{sku or ''}".encode()
        ).hexdigest()

        obj = Order(
            org_id=upload.org_id,
            upload_id=upload.id,
            import_row_id=None,
            partner_id=partner_id,
            order_reference=order_reference,
            channel=clean_text(_value(raw, tmap, "channel")),
            order_date=order_date,
            sku=sku,
            product_name=clean_text(_value(raw, tmap, "product_name"), 500),
            quantity=quantity,
            gross_amount=gross,
            discount=discount,
            net_amount=net,
            payment_method=clean_text(_value(raw, tmap, "payment_method")),
            customer_city=clean_text(_value(raw, tmap, "customer_city")),
            customer_state=clean_text(_value(raw, tmap, "customer_state")),
            status=status,
            raw_data=raw,
            dedup_hash=dedup_hash,
        )
        return obj, (order_reference, sku or "", str(partner_id or "")), []

    def _build_settlement(self, upload, raw, tmap, lookup, row_number):
        errors: list[str] = []
        order_reference = normalize_id(_value(raw, tmap, "order_reference"))
        if not order_reference:
            errors.append("missing_order_reference")
        self._optional_date(raw, tmap, "settlement_date", errors)
        if errors:
            return None, None, errors

        settlement_reference = normalize_id(_value(raw, tmap, "settlement_reference"))
        if not settlement_reference:
            settlement_reference = _synthetic("STL", upload, row_number)

        gross = parse_decimal(_value(raw, tmap, "gross_amount")) or ZERO
        commission = parse_decimal(_value(raw, tmap, "commission")) or ZERO
        shipping = parse_decimal(_value(raw, tmap, "shipping_fee")) or ZERO
        other = parse_decimal(_value(raw, tmap, "other_fees")) or ZERO
        tcs = parse_decimal(_value(raw, tmap, "tcs_deducted")) or ZERO
        tds = parse_decimal(_value(raw, tmap, "tds_deducted")) or ZERO
        expected_net = gross - commission - shipping - other - tcs - tds
        actual = parse_decimal(_value(raw, tmap, "actual_received"))
        if actual is None:
            actual = expected_net

        obj = Settlement(
            org_id=upload.org_id,
            upload_id=upload.id,
            partner_id=self._resolve_partner(upload, raw, tmap, lookup),
            settlement_reference=settlement_reference,
            order_reference=order_reference,
            settlement_date=parse_date(_value(raw, tmap, "settlement_date")),
            transaction_type=clean_text(_value(raw, tmap, "transaction_type")),
            gross_amount=gross,
            commission=commission,
            shipping_fee=shipping,
            other_fees=other,
            tcs_deducted=tcs,
            tds_deducted=tds,
            expected_net_settlement=expected_net,
            actual_received=actual,
            difference=actual - expected_net,
            raw_data=raw,
        )
        return obj, (settlement_reference, order_reference), []

    def _build_cod_remittance(self, upload, raw, tmap, lookup, row_number):
        errors: list[str] = []
        order_reference = normalize_id(_value(raw, tmap, "order_reference"))
        if not order_reference:
            errors.append("missing_order_reference")
        self._optional_date(raw, tmap, "remittance_date", errors)
        if errors:
            return None, None, errors

        reference = normalize_id(_value(raw, tmap, "remittance_reference"))
        if not reference:
            reference = _synthetic("REM", upload, row_number)
        utr = normalize_id(_value(raw, tmap, "utr_number"))
        status = map_enum(
            _value(raw, tmap, "status"), COD_STATUS_MAP, CODRemittanceStatus.PENDING
        )

        obj = CODRemittance(
            org_id=upload.org_id,
            upload_id=upload.id,
            partner_id=self._resolve_partner(upload, raw, tmap, lookup),
            remittance_reference=reference,
            order_reference=order_reference,
            remittance_date=parse_date(_value(raw, tmap, "remittance_date")),
            cod_amount=parse_decimal(_value(raw, tmap, "cod_amount")) or ZERO,
            remitted_amount=parse_decimal(_value(raw, tmap, "remitted_amount")) or ZERO,
            utr_number=utr,
            status=status,
            raw_data=raw,
        )
        return obj, ((utr or reference), order_reference), []

    def _build_freight(self, upload, raw, tmap, lookup, row_number):
        errors: list[str] = []
        order_reference = normalize_id(_value(raw, tmap, "order_reference"))
        if not order_reference:
            errors.append("missing_order_reference")
        self._optional_date(raw, tmap, "invoice_date", errors)
        if errors:
            return None, None, errors

        invoice_reference = normalize_id(_value(raw, tmap, "invoice_reference"))
        if not invoice_reference:
            invoice_reference = _synthetic("FRT", upload, row_number)
        awb = normalize_id(_value(raw, tmap, "awb_number"))

        actual_weight = parse_decimal(_value(raw, tmap, "actual_weight_kg"), 3) or ZERO
        charged_weight = parse_decimal(_value(raw, tmap, "charged_weight_kg"), 3)
        if charged_weight is None:
            charged_weight = actual_weight
        freight_amount = parse_decimal(_value(raw, tmap, "freight_amount")) or ZERO
        cod_charges = parse_decimal(_value(raw, tmap, "cod_charges")) or ZERO
        total_freight = parse_decimal(_value(raw, tmap, "total_freight"))
        if total_freight is None:
            total_freight = freight_amount + cod_charges

        partner_id = self._resolve_partner(upload, raw, tmap, lookup)
        obj = FreightRecord(
            org_id=upload.org_id,
            upload_id=upload.id,
            partner_id=partner_id,
            invoice_reference=invoice_reference,
            order_reference=order_reference,
            awb_number=awb,
            invoice_date=parse_date(_value(raw, tmap, "invoice_date")),
            origin_pincode=normalize_id(_value(raw, tmap, "origin_pincode"), 10),
            destination_pincode=normalize_id(
                _value(raw, tmap, "destination_pincode"), 10
            ),
            zone=clean_text(_value(raw, tmap, "zone"), 10),
            actual_weight_kg=actual_weight,
            charged_weight_kg=charged_weight,
            rate_per_kg=parse_decimal(_value(raw, tmap, "rate_per_kg")) or ZERO,
            freight_amount=freight_amount,
            cod_charges=cod_charges,
            total_freight=total_freight,
            raw_data=raw,
        )
        return obj, (invoice_reference, awb or ""), []

    def _build_return(self, upload, raw, tmap, lookup, row_number):
        errors: list[str] = []
        order_reference = normalize_id(_value(raw, tmap, "order_reference"))
        if not order_reference:
            errors.append("missing_order_reference")
        self._optional_date(raw, tmap, "return_date", errors)
        self._optional_date(raw, tmap, "refund_date", errors)
        if errors:
            return None, None, errors

        reference = normalize_id(_value(raw, tmap, "return_id_reference"))
        if not reference:
            reference = _synthetic("RET", upload, row_number)

        obj = Return(
            org_id=upload.org_id,
            upload_id=upload.id,
            partner_id=self._resolve_partner(upload, raw, tmap, lookup),
            return_id_reference=reference,
            order_reference=order_reference,
            return_date=parse_date(_value(raw, tmap, "return_date")),
            return_reason=clean_text(_value(raw, tmap, "return_reason"), 255),
            return_status=map_enum(
                _value(raw, tmap, "return_status"),
                RETURN_STATUS_MAP,
                ReturnStatus.PENDING,
            ),
            refund_amount=parse_decimal(_value(raw, tmap, "refund_amount")) or ZERO,
            refund_status=map_enum(
                _value(raw, tmap, "refund_status"),
                REFUND_STATUS_MAP,
                RefundStatus.PENDING,
            ),
            refund_date=parse_date(_value(raw, tmap, "refund_date")),
            raw_data=raw,
        )
        return obj, (reference, order_reference), []

    def _build_scan(self, upload, raw, tmap, lookup, row_number):
        errors: list[str] = []
        order_reference = normalize_id(_value(raw, tmap, "order_reference"))
        if not order_reference:
            errors.append("missing_order_reference")
        self._optional_date(raw, tmap, "scan_date", errors)
        if errors:
            return None, None, errors

        reference = normalize_id(_value(raw, tmap, "scan_reference"))
        if not reference:
            reference = _synthetic("SCN", upload, row_number)

        obj = WarehouseScan(
            org_id=upload.org_id,
            upload_id=upload.id,
            partner_id=self._resolve_partner(upload, raw, tmap, lookup),
            scan_reference=reference,
            order_reference=order_reference,
            awb_number=normalize_id(_value(raw, tmap, "awb_number")),
            scan_date=parse_date(_value(raw, tmap, "scan_date")),
            scan_type=clean_text(_value(raw, tmap, "scan_type"), 50),
            status=clean_text(_value(raw, tmap, "status"), 50),
            location=clean_text(_value(raw, tmap, "location"), 100),
            raw_data=raw,
        )
        return obj, (reference,), []

    def _optional_date(self, raw, tmap, field, errors) -> tuple[bool, date | None]:
        raw_value = _value(raw, tmap, field)
        if is_blank(raw_value):
            return True, None
        parsed = parse_date(raw_value)
        if parsed is None:
            errors.append(f"invalid_{field}")
            return False, None
        return True, parsed
