"""Returns engine — returns that never reached the warehouse.

Spec (Phase D): flag returns where the refund money leaves the business but no
warehouse scan within the configured return window proves the item came back.

Emission rules:
* return_status in (received, qc_passed, qc_failed) — receipt is *claimed* by
  the return record itself, so a RECEIVED-type warehouse scan dated within
  [return_date, return_date + window] must exist; otherwise → return_not_received.
* return_status in (in_transit, pending) — still travelling → not_yet_due.
* refund processed + goods missing → claim of refund_amount; refund not yet
  paid → discrepancy only (no money to reclaim).
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.order import RefundStatus, Return, ReturnStatus, WarehouseScan
from app.models.reconciliation import ReconciliationRun
from app.modules.matching.common import (
    FlaggedRow,
    StreamStatus,
    Writer,
)
from app.modules.matching.params import ReconParams

_EVIDENCE_TYPES = {"received", "return_received", "qc_passed", "qc_received"}
_STILL_MOVING = {ReturnStatus.IN_TRANSIT, ReturnStatus.PENDING}


class ReturnsEngine:
    def __init__(self, db: Session, run: ReconciliationRun, params: ReconParams | None = None):
        self.db = db
        self.run = run
        self.params = params or ReconParams()

    def execute(self, as_of: date | None = None) -> dict:
        p = self.params
        writer = Writer(self.db, self.run, self.params)
        returns = self._returns(self.run.source_upload_id)
        scans = self._scans(self.run.target_upload_id)

        by_reference: dict[str, list[tuple]] = defaultdict(list)
        for scan in scans:
            by_reference[scan[1]].append(scan)

        for row in returns:
            reference = row[1]
            return_date: date | None = row[2]
            status = row[3]
            refund_amount: Decimal = row[4]

            if status in _STILL_MOVING:
                writer.result(
                    reference,
                    target_record_id=None,
                    expected=refund_amount,
                    actual=Decimal("0"),
                    difference=Decimal("0"),
                    status=StreamStatus.NOT_YET_DUE,
                    source_record_id=row[0],
                    details={
                        "return_status": status.value,
                        "refund_status": row[5].value,
                    },
                    explanation=f"Return for {reference} still in transit; no receipt check yet.",
                )
                continue

            scan = self._find_evidence(
                by_reference.get(reference, []), return_date, p.return_scan_window_days
            )
            if scan is not None:
                writer.result(
                    reference,
                    target_record_id=scan[0],
                    expected=refund_amount,
                    actual=refund_amount,
                    difference=Decimal("0"),
                    status=StreamStatus.SETTLED,
                    source_record_id=row[0],
                    details={
                        "return_status": status.value,
                        "scan_reference": scan[4],
                        "scan_date": scan[2].isoformat() if scan[2] else None,
                        "scan_type": scan[3],
                    },
                    explanation=f"Return for {reference} received at warehouse.",
                )
                continue

            # Still within the scan window? → not flagged yet
            if return_date is not None:
                window_end = return_date + timedelta(days=p.return_scan_window_days)
                effective_as_of = as_of or date.today()
                if effective_as_of <= window_end:
                    writer.result(
                        reference,
                        target_record_id=None,
                        expected=refund_amount,
                        actual=Decimal("0"),
                        difference=Decimal("0"),
                        status=StreamStatus.RETURN_IN_TRANSIT,
                        source_record_id=row[0],
                        details={
                            "return_status": status.value,
                            "window_end": window_end.isoformat(),
                        },
                        explanation=(
                            f"Return for {reference} within scan window "
                            f"through {window_end.isoformat()}."
                        ),
                    )
                    continue

            refund_paid = row[5] == RefundStatus.PROCESSED
            difference = (Decimal("0") - refund_amount) if refund_paid else Decimal("0")
            writer.result(
                reference,
                target_record_id=None,
                expected=refund_amount,
                actual=Decimal("0"),
                difference=difference,
                status=StreamStatus.RETURN_NOT_RECEIVED,
                source_record_id=row[0],
                details={
                    "return_status": status.value,
                    "refund_status": row[5].value,
                    "scan_window_days": p.return_scan_window_days,
                },
                explanation=(
                    f"No warehouse scan within {p.return_scan_window_days} days for "
                    f"return {reference}."
                ),
            )
            writer.flag(
                FlaggedRow(
                    order_reference=reference,
                    source_record_id=row[0],
                    target_record_id=None,
                    stream_status=StreamStatus.RETURN_NOT_RECEIVED,
                    expected_amount=refund_amount,
                    actual_amount=Decimal("0"),
                    difference=difference,
                    claimable=refund_paid,
                    explanation=(
                        f"Return {reference} never scanned into the warehouse within "
                        f"{p.return_scan_window_days} days"
                        + (f"; refund of ₹{refund_amount} already paid." if refund_paid else ".")
                    ),
                    partner_id=row[6],
                    details={
                        "return_status": status.value,
                        "refund_status": row[5].value,
                        "scan_window_days": p.return_scan_window_days,
                    },
                )
            )

        summary = writer.commit()
        return {"total_source": len(returns), "total_target": len(scans), **summary}

    @staticmethod
    def _find_evidence(
        scan_rows: list[tuple], return_date: date | None, scan_window_days: int = 7
    ) -> tuple | None:
        if return_date is None:
            return None
        window_end = return_date + timedelta(days=scan_window_days)
        for scan in scan_rows:
            scan_date: date | None = scan[2]
            scan_type = (scan[3] or "").strip().lower()
            if scan_date is None:
                continue
            if return_date <= scan_date <= window_end and scan_type in _EVIDENCE_TYPES:
                return scan
        return None

    def _returns(self, upload_id: uuid.UUID):
        rows = self.db.execute(
            select(
                Return.id,
                Return.order_reference,
                Return.return_date,
                Return.return_status,
                Return.refund_amount,
                Return.refund_status,
                Return.partner_id,
            ).where(Return.upload_id == upload_id)
        ).all()
        return [
            (r[0], r[1], r[2], r[3], r[4] if r[4] is not None else Decimal("0"), r[5], r[6])
            for r in rows
        ]

    def _scans(self, upload_id: uuid.UUID):
        rows = self.db.execute(
            select(
                WarehouseScan.id,
                WarehouseScan.order_reference,
                WarehouseScan.scan_date,
                WarehouseScan.scan_type,
                WarehouseScan.scan_reference,
                WarehouseScan.status,
            ).where(WarehouseScan.upload_id == upload_id)
        ).all()
        return [(r[0], r[1], r[2], r[3], r[4], r[5]) for r in rows]
