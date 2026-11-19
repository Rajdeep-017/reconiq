"""Settlement engine — rate-card aware, order↔settlement grouping.

Formula (per Phase D spec):
    expected   = Σ (gross − commission − shipping_fee − other_fees)   (pre-tax)
    received   = Σ (actual_received + tcs + tds)                      (pre-tax)
    gap        = received − expected
Statuses:
    gap ≤ −tolerance            → short_paid
    gap within ±tolerance       → settled (or settled_late if paid after due date)
    no settlement row           → unpaid_past_due (past due) | not_yet_due (fresh order)
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.reconciliation import ReconciliationRun
from app.models.settlement import Settlement
from app.modules.matching.common import (
    FlaggedRow,
    StreamStatus,
    Writer,
)
from app.modules.matching.params import ReconParams

_GRACE = Decimal("0")


def _as_of(settlement_dates: set[date], run_as_of: date | None) -> date:
    """Deterministic wall clock for past-due decisions."""
    if run_as_of is not None:
        return run_as_of
    if settlement_dates:
        return max(settlement_dates)
    return date.today()


class SettlementEngine:
    def __init__(self, db: Session, run: ReconciliationRun, params: ReconParams | None = None):
        self.db = db
        self.run = run
        self.params = params or ReconParams()

    def execute(self, as_of: date | None = None) -> dict:
        p = self.params
        writer = Writer(self.db, self.run, self.params)
        orders = self._orders(self.run.source_upload_id)
        settlements = self._settlements(self.run.target_upload_id)
        dates = {s[9] for s in settlements if s[9] is not None}
        effective_as_of = _as_of(dates, as_of)

        by_reference: dict[str, list] = {}
        for row in settlements:
            by_reference.setdefault(row[1], []).append(row)

        for order in orders:
            reference = order[1]
            order_date: date | None = order[2]
            legs = by_reference.get(reference, [])

            if not legs:
                due = order_date + timedelta(days=p.settlement_due_days) if order_date else None
                if due is not None and effective_as_of < due:
                    writer.result(
                        reference,
                        target_record_id=None,
                        expected=order[3],
                        actual=Decimal("0"),
                        difference=Decimal("0"),
                        status=StreamStatus.NOT_YET_DUE,
                        source_record_id=order[0],
                        details={
                            "expected_net": str(order[3]),
                            "due_date": due.isoformat(),
                            "settlement_legs": 0,
                        },
                        explanation=f"No settlement booked yet; due {due.isoformat()}.",
                    )
                    continue

                writer.result(
                    reference,
                    target_record_id=None,
                    expected=order[3],
                    actual=Decimal("0"),
                    difference=(Decimal("0") - order[3]),
                    status=StreamStatus.UNPAID_PAST_DUE,
                    source_record_id=order[0],
                    details={
                        "expected_net": str(order[3]),
                        "due_date": due.isoformat() if due else None,
                        "as_of": effective_as_of.isoformat(),
                        "settlement_legs": 0,
                    },
                    explanation=f"No settlement booked for order {reference} (expected ₹{order[3]}).",
                )
                writer.flag(
                    FlaggedRow(
                        order_reference=reference,
                        source_record_id=order[0],
                        target_record_id=None,
                        stream_status=StreamStatus.UNPAID_PAST_DUE,
                        expected_amount=order[3],
                        actual_amount=Decimal("0"),
                        difference=Decimal("0") - order[3],
                        explanation=f"No settlement recorded for order {reference}; expected ₹{order[3]}.",
                        partner_id=order[5],
                        details={"due_date": due.isoformat() if due else None},
                    )
                )
                continue

            expected = Decimal("0")
            received = Decimal("0")
            settlement_date = None
            leg_count = len(legs)
            for leg in legs:
                expected += leg[2] - leg[3] - leg[4] - leg[5]
                received += leg[8] + leg[6] + leg[7]
                if settlement_date is None or (leg[9] or date.min) > settlement_date:
                    settlement_date = leg[9]

            gap = received - expected
            due = order_date + timedelta(days=p.settlement_due_days) if order_date else None
            status = StreamStatus.SETTLED
            if gap < -p.tolerance:
                status = StreamStatus.SHORT_PAID
            elif received > expected + p.tolerance:
                status = StreamStatus.SETTLED
            elif due is not None and settlement_date and settlement_date > due:
                status = StreamStatus.SETTLED_LATE

            writer.result(
                reference,
                target_record_id=legs[0][10],
                expected=expected,
                actual=received,
                difference=gap,
                status=status,
                source_record_id=order[0],
                details={
                    "expected_net_pre_tax": str(expected),
                    "net_plus_tcs_tds": str(received),
                    "gap": str(gap),
                    "tolerance": str(p.tolerance),
                    "settlement_legs": leg_count,
                    "settlement_date": settlement_date.isoformat() if settlement_date else None,
                    "due_date": due.isoformat() if due else None,
                },
                explanation=(
                    f"Settlement gap ₹{gap} ({leg_count} legs) for {reference}."
                    if abs(gap) > _GRACE
                    else f"Order {reference} settled."
                ),
            )
            if status == StreamStatus.SHORT_PAID:
                writer.flag(
                    FlaggedRow(
                        order_reference=reference,
                        source_record_id=order[0],
                        target_record_id=legs[0][10],
                        stream_status=StreamStatus.SHORT_PAID,
                        expected_amount=expected,
                        actual_amount=received,
                        difference=gap,
                        explanation=f"Short paid ₹{-gap} on {reference}: received ₹{received} vs expected ₹{expected}.",
                        partner_id=order[5],
                        details={"settlement_legs": leg_count, "gap": str(gap)},
                    )
                )
            elif status == StreamStatus.SETTLED_LATE:
                writer.flag(
                    FlaggedRow(
                        order_reference=reference,
                        source_record_id=order[0],
                        target_record_id=legs[0][10],
                        stream_status=StreamStatus.SETTLED_LATE,
                        expected_amount=expected,
                        actual_amount=received,
                        difference=Decimal("0"),
                        claimable=True,
                        explanation=f"Settled late on {reference}: settled {settlement_date} vs due {due.isoformat() if due else 'n/a'}.",
                        partner_id=order[5],
                        details={
                            "settlement_date": settlement_date.isoformat() if settlement_date else None,
                            "due_date": due.isoformat() if due else None,
                        },
                    )
                )

        summary = writer.commit()
        return {"total_source": len(orders), "total_target": len(settlements), **summary}

    def _orders(self, upload_id: uuid.UUID):
        rows = self.db.execute(
            select(
                Order.id, Order.order_reference, Order.order_date,
                Order.net_amount, Order.status, Order.partner_id,
            ).where(Order.upload_id == upload_id)
        ).all()
        return [
            (r[0], r[1], r[2], r[3] if r[3] is not None else Decimal("0"), r[4], r[5])
            for r in rows
        ]

    def _settlements(self, upload_id: uuid.UUID):
        rows = self.db.execute(
            select(
                Settlement.id, Settlement.order_reference,
                Settlement.gross_amount, Settlement.commission,
                Settlement.shipping_fee, Settlement.other_fees,
                Settlement.tcs_deducted, Settlement.tds_deducted,
                Settlement.actual_received, Settlement.settlement_date,
                Settlement.id,
            ).where(Settlement.upload_id == upload_id)
        ).all()
        return [
            (
                r[0], r[1],
                r[2] if r[2] is not None else Decimal("0"),
                r[3] if r[3] is not None else Decimal("0"),
                r[4] if r[4] is not None else Decimal("0"),
                r[5] if r[5] is not None else Decimal("0"),
                r[6] if r[6] is not None else Decimal("0"),
                r[7] if r[7] is not None else Decimal("0"),
                r[8] if r[8] is not None else Decimal("0"),
                r[9], r[10],
            )
            for r in rows
        ]
