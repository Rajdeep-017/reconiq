"""COD engine — unremitted / short / late COD cash.

Spec (Phase D):
    expected per COD order = order.net_amount  (cash the marketplace collected)
    received per order     = Σ remitted_amount across remittance legs
    statuses:
        gap ≤ −tolerance                → short_paid
        gap within ±tolerance, paid late → settled_late
        no remittance, past due         → unpaid_past_due
        no remittance, not due yet      → not_yet_due
        fully remitted on time          → settled
Cancelled COD orders are reported (per the sample ground truth) but only as a
LOW-severity advisory discrepancy; no claim is auto-created because cash was
never collected.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.models.reconciliation import ReconciliationRun
from app.models.settlement import CODRemittance
from app.modules.matching.common import (
    COD_DUE_DAYS,
    TOLERANCE,
    FlaggedRow,
    StreamStatus,
    Writer,
)
from app.modules.matching.params import ReconParams


def _as_of(remittance_dates: set[date], run_as_of: date | None) -> date:
    if run_as_of is not None:
        return run_as_of
    return max(remittance_dates) if remittance_dates else date.today()


class CODEngine:
    def __init__(self, db: Session, run: ReconciliationRun, params: ReconParams | None = None):
        self.db = db
        self.run = run
        self.params = params or ReconParams()

    def execute(self, as_of: date | None = None) -> dict:
        p = self.params
        writer = Writer(self.db, self.run, self.params)
        orders = self._orders(self.run.source_upload_id)
        remittances = self._remittances(self.run.target_upload_id)
        as_of_set = {r[4] for r in remittances if r[4] is not None}
        effective_as_of = _as_of(as_of_set, as_of)

        by_reference: dict[str, list] = {}
        for row in remittances:
            by_reference.setdefault(row[1], []).append(row)

        total_target = len(remittances)
        for order in orders:
            # tuple: id, reference, order_date, net_amount, status, partner_id, gross_amount
            reference = order[1]
            order_date: date | None = order[2]
            due = order_date + timedelta(days=p.cod_due_days) if order_date else None
            legs = by_reference.get(reference, [])

            if not legs:
                if due is not None and effective_as_of < due:
                    writer.result(
                        reference,
                        target_record_id=None,
                        expected=order[3],
                        actual=Decimal("0"),
                        difference=Decimal("0"),
                        status=StreamStatus.NOT_YET_DUE,
                        source_record_id=order[0],
                        details={"cod_expected": str(order[3]), "due_date": due.isoformat()},
                        explanation=f"COD cash not yet due (due {due.isoformat()}).",
                    )
                    continue
                cancelled = order[4] == OrderStatus.CANCELLED
                writer.result(
                    reference,
                    target_record_id=None,
                    expected=order[3],
                    actual=Decimal("0"),
                    difference=Decimal("0") - order[3],
                    status=StreamStatus.UNPAID_PAST_DUE,
                    source_record_id=order[0],
                    details={
                        "cod_expected": str(order[3]),
                        "order_status": order[4].value,
                        "as_of": effective_as_of.isoformat(),
                    },
                    explanation=(
                        f"No COD remittance for order {reference}"
                        + (" (order cancelled before delivery)." if cancelled else "")
                    ),
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
                        claimable=not cancelled,
                        explanation=(
                            f"Cash on delivery for {reference} was never remitted "
                            f"(₹{order[3]} expected)."
                        ),
                        partner_id=order[5],
                        details={
                            "order_status": order[4].value,
                            "due_date": due.isoformat() if due else None,
                            "claimable_reason": "cash_never_collected"
                            if cancelled
                            else "cod_unremitted",
                        },
                    )
                )
                continue

            expected = Decimal("0")
            received = Decimal("0")
            remittance_date = None
            for leg in legs:
                expected += leg[2] if leg[2] is not None else order[3]
                received += leg[3] if leg[3] is not None else Decimal("0")
                if remittance_date is None or (leg[4] or date.min) > remittance_date:
                    remittance_date = leg[4]

            gap = received - expected
            status = StreamStatus.SETTLED
            if gap < -p.tolerance:
                status = StreamStatus.SHORT_PAID
            elif (
                due is not None
                and remittance_date is not None
                and remittance_date > due
                and abs(gap) <= TOLERANCE
                and abs(gap) <= p.tolerance
            ):
                status = StreamStatus.SETTLED_LATE

            writer.result(
                reference,
                target_record_id=legs[0][5],
                expected=expected,
                actual=received,
                difference=gap,
                status=status,
                source_record_id=order[0],
                details={
                    "cod_expected": str(expected),
                    "cod_remitted": str(received),
                    "gap": str(gap),
                    "remittance_date": (
                        remittance_date.isoformat() if remittance_date else None
                    ),
                    "due_date": due.isoformat() if due else None,
                    "remittance_legs": len(legs),
                },
                explanation=(
                    f"COD gap ₹{gap} ({len(legs)} legs) for {reference}."
                    if abs(gap) > Decimal("0")
                    else f"COD remitted in full for {reference}."
                ),
            )
            if status == StreamStatus.SHORT_PAID:
                writer.flag(
                    FlaggedRow(
                        order_reference=reference,
                        source_record_id=order[0],
                        target_record_id=legs[0][5],
                        stream_status=StreamStatus.SHORT_PAID,
                        expected_amount=expected,
                        actual_amount=received,
                        difference=gap,
                        explanation=(
                            f"COD short remitted on {reference}: ₹{received} of ₹{expected}."
                        ),
                        partner_id=order[5],
                        details={"remittance_legs": len(legs), "gap": str(gap)},
                    )
                )
            elif status == StreamStatus.SETTLED_LATE:
                writer.flag(
                    FlaggedRow(
                        order_reference=reference,
                        source_record_id=order[0],
                        target_record_id=legs[0][5],
                        stream_status=StreamStatus.SETTLED_LATE,
                        expected_amount=expected,
                        actual_amount=received,
                        difference=Decimal("0"),
                        claimable=False,
                        explanation=(
                            f"COD settled late on {reference} "
                            f"({remittance_date} vs due {due.isoformat() if due else 'n/a'})."
                        ),
                        partner_id=order[5],
                        details={
                            "remittance_date": (
                                remittance_date.isoformat() if remittance_date else None
                            ),
                            "due_date": due.isoformat() if due else None,
                        },
                    )
                )

        summary = writer.commit()
        return {"total_source": len(orders), "total_target": total_target, **summary}

    def _orders(self, upload_id: uuid.UUID):
        """Only COD orders participate (status delivered/returned/rto/cancelled)."""
        rows = self.db.execute(
            select(
                Order.id,
                Order.order_reference,
                Order.order_date,
                Order.net_amount,
                Order.status,
                Order.partner_id,
                Order.gross_amount,
            )
            .where(Order.upload_id == upload_id)
            .where(func.lower(Order.payment_method).in_(("cod", "cash on delivery", "cash_on_delivery")))
        ).all()
        return [
            (
                r[0],
                r[1],
                r[2],
                r[3] if r[3] is not None else Decimal("0"),
                r[4],
                r[5],
                r[6] if r[6] is not None else Decimal("0"),
            )
            for r in rows
        ]

    def _remittances(self, upload_id: uuid.UUID):
        rows = self.db.execute(
            select(
                CODRemittance.id,
                CODRemittance.order_reference,
                CODRemittance.cod_amount,
                CODRemittance.remitted_amount,
                CODRemittance.remittance_date,
                CODRemittance.id,
            ).where(CODRemittance.upload_id == upload_id)
        ).all()
        return [
            (
                r[0],
                r[1],
                r[2] if r[2] is not None else None,
                r[3] if r[3] is not None else Decimal("0"),
                r[4],
                r[5],
            )
            for r in rows
        ]
