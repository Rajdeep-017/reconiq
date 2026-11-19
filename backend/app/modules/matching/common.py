"""Shared helpers for the Phase D matching engines."""
from __future__ import annotations

import enum
import json
import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import insert
from sqlalchemy.orm import Session

from app.models.discrepancy import (
    Claim,
    ClaimStatus,
    Discrepancy,
    DiscrepancySeverity,
    DiscrepancyStatus,
    DiscrepancyType,
)
from app.models.reconciliation import MatchMethod, MatchStatus, ReconciliationResult, ReconciliationRun
from app.modules.matching.params import ReconParams

# Legacy module-level constants kept for backward-compatibility with tests
# that import them.  New code should use ReconParams instead.
TOLERANCE = Decimal("10.00")
SETTLEMENT_DUE_DAYS = 15
COD_DUE_DAYS = 15
RETURN_SCAN_WINDOW_DAYS = 7
RTO_EXPECTED_MULTIPLIER = Decimal("0.5")


class StreamStatus(str, enum.Enum):
    """Phase D statuses (per user spec) + the freight-missing analog."""

    SETTLED = "settled"
    SHORT_PAID = "short_paid"
    UNPAID_PAST_DUE = "unpaid_past_due"
    FREIGHT_OVERCHARGED = "freight_overcharged"
    RETURN_NOT_RECEIVED = "return_not_received"
    SETTLED_LATE = "settled_late"
    RETURN_IN_TRANSIT = "return_in_transit"
    NOT_YET_DUE = "not_yet_due"
    MISSING_FREIGHT_INVOICE = "missing_freight_invoice"


STREAM_STATUS_TO_DISCREPANCY_TYPE = {
    StreamStatus.SHORT_PAID: "SHORT_PAID",
    StreamStatus.UNPAID_PAST_DUE: "UNPAID_PAST_DUE",
    StreamStatus.FREIGHT_OVERCHARGED: "FREIGHT_OVERCHARGED",
    StreamStatus.MISSING_FREIGHT_INVOICE: "MISSING_FREIGHT_INVOICE",
    StreamStatus.RETURN_NOT_RECEIVED: "RETURN_NOT_RECEIVED",
    StreamStatus.SETTLED_LATE: "SETTLED_LATE",
}

CLAIMABLE_STATUS = {
    StreamStatus.SHORT_PAID,
    StreamStatus.UNPAID_PAST_DUE,
    StreamStatus.FREIGHT_OVERCHARGED,
    StreamStatus.MISSING_FREIGHT_INVOICE,
    StreamStatus.RETURN_NOT_RECEIVED,
}

SEVERITY_BY_STATUS = {
    StreamStatus.SHORT_PAID: DiscrepancySeverity.MEDIUM,
    StreamStatus.UNPAID_PAST_DUE: DiscrepancySeverity.HIGH,
    StreamStatus.RETURN_NOT_RECEIVED: DiscrepancySeverity.HIGH,
    StreamStatus.FREIGHT_OVERCHARGED: DiscrepancySeverity.MEDIUM,
    StreamStatus.MISSING_FREIGHT_INVOICE: DiscrepancySeverity.LOW,
    StreamStatus.SETTLED_LATE: DiscrepancySeverity.LOW,
}


@dataclass
class FlaggedRow:
    """One engine detection: an order (or return) outside the tolerance."""

    order_reference: str
    source_record_id: uuid.UUID | None
    target_record_id: uuid.UUID | None
    stream_status: StreamStatus
    expected_amount: Decimal
    actual_amount: Decimal
    difference: Decimal
    explanation: str
    partner_id: uuid.UUID | None = None
    details: dict | None = None
    claimable: bool = True
    # Optional override of the discrepancy type name (e.g. duplicate AWB legs
    # carry their own type while the per-order status stays freight_overcharged).
    discrepancy_type_override: str | None = None


def is_cod(payment_method: str | None) -> bool:
    return payment_method is not None and payment_method.strip().lower() in {
        "cod",
        "cash on delivery",
        "cash_on_delivery",
    }


def due_date(order_date: date | None, days: int) -> date | None:
    if order_date is None:
        return None
    return order_date + timedelta(days=days)


def normalize_stream_status(match_status: MatchStatus) -> StreamStatus | None:
    return {
        MatchStatus.MATCHED: StreamStatus.SETTLED,
        MatchStatus.PARTIAL: StreamStatus.SHORT_PAID,
        MatchStatus.UNMATCHED: StreamStatus.UNPAID_PAST_DUE,
    }.get(match_status)


class Writer:
    """Batches result rows / discrepancies / claims for a run and bulk-inserts them."""

    def __init__(self, db: Session, run: ReconciliationRun, params: ReconParams | None = None):
        self.db = db
        self.run = run
        self.params = params or ReconParams()
        self.flags: list[FlaggedRow] = []
        self.results: list[dict] = []
        self.results_by_reference: dict[str, dict] = {}
        self.discrepancies: list[dict] = []
        self.claims: list[dict] = []
        self.total_expected = Decimal("0")
        self.total_received = Decimal("0")
        self.total_discrepancy = Decimal("0")
        self.matched_count = 0
        self.unmatched_count = 0

    # ------------------------------------------------------------------ rows
    def result(
        self,
        order_reference: str,
        *,
        target_record_id: uuid.UUID | None,
        expected: Decimal,
        actual: Decimal,
        difference: Decimal,
        status: StreamStatus | None = None,
        match_status: MatchStatus | None = None,
        confidence: Decimal = Decimal("1.0"),
        source_record_id: uuid.UUID | None = None,
        details: dict | None = None,
        explanation: str | None = None,
    ) -> dict:
        row_id = uuid.uuid4()
        resolved_match = match_status or (
            MatchStatus.MATCHED
            if status == StreamStatus.SETTLED
            else (
                MatchStatus.PARTIAL
                if status in {StreamStatus.SHORT_PAID, StreamStatus.FREIGHT_OVERCHARGED}
                else MatchStatus.UNMATCHED
            )
        )
        row = {
            "id": row_id,
            "org_id": self.run.org_id,
            "run_id": self.run.id,
            "order_reference": order_reference,
            "source_record_id": source_record_id,
            "target_record_id": target_record_id,
            "match_method": MatchMethod.EXACT,
            "match_status": resolved_match,
            "stream_status": status.value if status else None,
            "confidence_score": confidence,
            "expected_amount": expected.quantize(Decimal("0.01")),
            "actual_amount": actual.quantize(Decimal("0.01")),
            "difference": difference.quantize(Decimal("0.01")),
            "explanation": explanation,
            "details": details,
        }
        self.results.append(row)
        self.results_by_reference[order_reference] = row
        self.total_expected += row["expected_amount"]
        self.total_received += row["actual_amount"]
        if row["match_status"] == MatchStatus.MATCHED:
            self.matched_count += 1
        else:
            self.unmatched_count += 1
        return row

    def flag(self, flagged: FlaggedRow) -> None:
        self.flags.append(flagged)
        self.total_discrepancy += abs(flagged.difference)

    def _discrepancy_for(self, flagged: FlaggedRow) -> dict | None:
        type_member = (
            flagged.discrepancy_type_override
            or STREAM_STATUS_TO_DISCREPANCY_TYPE.get(flagged.stream_status)
        )
        if type_member is None:
            return None
        disc_id = uuid.uuid4()
        return {
            "id": disc_id,
            "org_id": self.run.org_id,
            "run_id": self.run.id,
            "result_id": (
                self.results_by_reference.get(flagged.order_reference, {}).get("id")
            ),
            "partner_id": flagged.partner_id,
            "order_reference": flagged.order_reference,
            "discrepancy_type": DiscrepancyType[type_member],
            "severity": SEVERITY_BY_STATUS.get(
                flagged.stream_status, DiscrepancySeverity.MEDIUM
            ),
            "status": DiscrepancyStatus.DETECTED,
            "expected_amount": flagged.expected_amount.quantize(Decimal("0.01")),
            "actual_amount": flagged.actual_amount.quantize(Decimal("0.01")),
            "difference_amount": flagged.difference.quantize(Decimal("0.01")),
            "explanation": flagged.explanation[:1000],
            "metadata_extra": flagged.details,
        }

    def _claim_for(self, flag: FlaggedRow, discrepancy: dict) -> dict | None:
        if not flag.claimable or abs(flag.difference) <= Decimal("0"):
            return None
        return {
            "id": uuid.uuid4(),
            "org_id": self.run.org_id,
            "discrepancy_id": discrepancy["id"],
            "partner_id": flag.partner_id,
            "created_by_id": self.run.created_by_id,
            "claim_reference": f"CLM-{uuid.uuid4().hex[:12].upper()}",
            "claim_type": discrepancy["discrepancy_type"].value,
            "claim_amount": abs(flag.difference).quantize(Decimal("0.01")),
            "recovered_amount": Decimal("0"),
            "status": ClaimStatus.DRAFT,
            "notes": flag.explanation[:500],
            "metadata_extra": flag.details,
        }

    def commit(self) -> dict:
        """Bulk-insert results, discrepancies, claims; return counts."""
        # Results first so discrepancy.result_id / FK resolves.
        if self.results:
            bulk_write_rows(self.db, ReconciliationResult, self.results)
        discrepancies = []
        claims = []
        for flag in self.flags:
            disc = self._discrepancy_for(flag)
            if disc is None:
                continue
            discrepancies.append(disc)
            claim = self._claim_for(flag, disc)
            if claim is not None:
                claims.append(claim)
        if discrepancies:
            bulk_write_rows(self.db, Discrepancy, discrepancies)
        if claims:
            bulk_write_rows(self.db, Claim, claims)

        return {
            "results": len(self.results),
            "discrepancies": len(discrepancies),
            "claims": len(claims),
            "matched_count": self.matched_count,
            "unmatched_count": self.unmatched_count,
            "total_expected": self.total_expected.quantize(Decimal("0.01")),
            "total_received": self.total_received.quantize(Decimal("0.01")),
            "total_discrepancy": self.total_discrepancy.quantize(Decimal("0.01")),
        }


def money(value: Decimal | None) -> Decimal:
    return value if value is not None else Decimal("0")


# ── high-throughput bulk write ────────────────────────────────────────────
# Small runs keep the normal ORM insert; large runs go through PostgreSQL
# COPY (single-round-trip page loading), which is ~20x faster than the
# executemany path for the engine's output tables.

COPY_MIN_ROWS = 1000


def _enum_db_value(col_type, value):
    """Translate an enum member to the string value the DB enum accepts.

    SQLAlchemy accepts either the member's value or name depending on how the
    model/migration defined the type, so check membership explicitly.
    """
    accepted = set(col_type.enums)
    if not isinstance(value, enum.Enum):
        if isinstance(value, str) and value not in accepted and value.lower() in accepted:
            return value.lower()
        return value
    if value.value in accepted:
        return value.value
    if value.name in accepted:
        return value.name
    return value


def bulk_write_rows(session, model, rows: list[dict]) -> None:
    """Insert rows via COPY when large, executemany otherwise."""
    if not rows:
        return
    if len(rows) < COPY_MIN_ROWS:
        session.execute(insert(model), rows)
        return

    from sqlalchemy import inspect as sa_inspect
    from sqlalchemy import Enum as SAEnum
    from sqlalchemy import JSON

    col_types = {c.key: c.type for c in sa_inspect(model).columns}
    columns = list(rows[0].keys())
    table = model.__tablename__

    converters: dict[str, object] = {}
    for col in columns:
        ct = col_types.get(col)
        if not isinstance(ct, (SAEnum, JSON)):
            continue
        if isinstance(ct, SAEnum):
            converters[col] = lambda v, ct=ct: _enum_db_value(ct, v)
        else:  # JSON/JSONB: serialize dicts/lists; psycopg copy has no dict dumper
            converters[col] = lambda v: (
                json.dumps(v) if isinstance(v, (dict, list)) else v
            )

    def row_values(row: dict) -> tuple:
        out = []
        for col in columns:
            v = row.get(col)
            conv = converters.get(col)
            if conv is not None and v is not None:
                v = conv(v)
            out.append(v)
        return tuple(out)

    raw_conn = session.connection().connection  # psycopg3 connection (same tx)
    with raw_conn.cursor() as cur:
        with cur.copy(f"COPY {table} ({', '.join(columns)}) FROM STDIN") as cp:
            for row in rows:
                cp.write_row(row_values(row))
