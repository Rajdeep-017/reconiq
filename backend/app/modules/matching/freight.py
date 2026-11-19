"""Freight engine — courier rate cards, RTO billing, duplicate AWB legs.

Spec (Phase D):
* expected = rate-card price: charged_weight × rate_per_kg + fixed_charge
  (+ cod_charge_percent applied to the order's gross for COD orders)
* RTO orders are billed at RTO_EXPECTED_MULTIPLIER × the forward price.
* overbilled = billed_freight > expected + ₹10 → freight_overcharged
* the same AWB billed more than once (different invoice refs) → duplicate_awb_billing
* delivered/returned/rto orders with no freight invoice → missing_freight_invoice
No rate card for the courier partner → the leg is informational-only (no flag):
we never fabricate an expected price.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.freight import FreightRecord
from app.models.order import Order, OrderStatus
from app.models.reconciliation import ReconciliationRun
from app.modules.matching.common import (
    FlaggedRow,
    StreamStatus,
    Writer,
    is_cod,
)
from app.modules.matching.params import ReconParams
from app.modules.matching.rate_cards import RateCardBook

_SHIPPED = {OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.RTO}


class FreightEngine:
    def __init__(self, db: Session, run: ReconciliationRun, params: ReconParams | None = None):
        self.db = db
        self.run = run
        self.params = params or ReconParams()

    def execute(self, as_of: date | None = None) -> dict:
        p = self.params
        writer = Writer(self.db, self.run, self.params)
        book = RateCardBook.load(self.db, self.run.org_id)
        orders = self._orders()
        freight_rows = self._freight()

        by_reference: dict[str, list] = defaultdict(list)
        for row in freight_rows:
            by_reference[row[1]].append(row)

        duplicate_awbs: Counter[str] = Counter(
            row[4] for row in freight_rows if row[4]
        )

        for order in orders:
            reference = order[1]
            legs = by_reference.get(reference, [])

            if not legs:
                if order[4] not in _SHIPPED:
                    continue  # cancelled/pending orders need no invoice
                writer.result(
                    reference,
                    target_record_id=None,
                    expected=Decimal("0"),
                    actual=Decimal("0"),
                    difference=Decimal("0"),
                    status=StreamStatus.MISSING_FREIGHT_INVOICE,
                    source_record_id=order[0],
                    details={"order_status": order[4].value},
                    explanation=f"No freight invoice for shipped order {reference}.",
                )
                writer.flag(
                    FlaggedRow(
                        order_reference=reference,
                        source_record_id=order[0],
                        target_record_id=None,
                        stream_status=StreamStatus.MISSING_FREIGHT_INVOICE,
                        expected_amount=Decimal("0"),
                        actual_amount=Decimal("0"),
                        difference=Decimal("0"),
                        explanation=(
                            f"Shipped order {reference} has no freight invoice "
                            "on file; request the courier's bill."
                        ),
                        partner_id=order[5],
                        details={"order_status": order[4].value},
                    )
                )
                continue

            billed_total = sum(leg[8] for leg in legs)
            first = legs[0]
            expected, cod_included = self._expected(book, order, first)
            overreason: str | None = None
            reason: str | None = None
            if expected is None:
                status = StreamStatus.SETTLED  # no rate card → cannot overcharge
                reason = "no_rate_card"
                gap = Decimal("0")
            else:
                gap = billed_total - expected
                if gap > p.tolerance:
                    status = StreamStatus.FREIGHT_OVERCHARGED
                    overreason = "billed_above_rate_card"
                else:
                    status = StreamStatus.SETTLED

            # Duplicate AWB legs: the same physical AWB billed more than once
            # anywhere in this org's invoices. One flag per billed leg.
            dup_legs = [
                leg for leg in legs if leg[4] and duplicate_awbs.get(leg[4], 0) >= 2
            ]
            if dup_legs and status == StreamStatus.FREIGHT_OVERCHARGED:
                overreason = "duplicate_awb"  # suppress the generic overcharge flag

            writer.result(
                reference,
                target_record_id=legs[0][0],
                expected=expected if expected is not None else Decimal("0"),
                actual=billed_total,
                difference=gap,
                status=status,
                source_record_id=order[0],
                details={
                    "freight_legs": len(legs),
                    "billed_total": str(billed_total),
                    "expected_from_rate_card": (
                        str(expected) if expected is not None else "no_rate_card"
                    ),
                    "cod_fee": str(cod_included) if expected is not None else None,
                    "reason": overreason or reason,
                    "awbs": [leg[4] for leg in legs],
                },
                explanation=(
                    f"Freight billed ₹{billed_total} vs rate card ₹{expected}."
                    if expected is not None
                    else f"Freight billed ₹{billed_total}; no rate card matched."
                ),
            )
            if status == StreamStatus.FREIGHT_OVERCHARGED and not dup_legs:
                writer.flag(
                    FlaggedRow(
                        order_reference=reference,
                        source_record_id=order[0],
                        target_record_id=legs[0][0],
                        stream_status=StreamStatus.FREIGHT_OVERCHARGED,
                        expected_amount=expected or Decimal("0"),
                        actual_amount=billed_total,
                        difference=gap,
                        explanation=(
                            f"Freight overcharge on {reference}: billed ₹{billed_total} vs "
                            f"rate-card expected ₹{expected}"
                            + (" (RTO billed at the full forward rate)."
                               if order[4] == OrderStatus.RTO else "")
                        ),
                        partner_id=order[5],
                        details={
                            "freight_legs": len(legs),
                            "reason": overreason,
                            "gap": str(gap),
                        },
                    )
                )

            for leg in dup_legs:
                awb = leg[4]
                writer.flag(
                    FlaggedRow(
                        order_reference=reference,
                        source_record_id=order[0],
                        target_record_id=leg[0],
                        stream_status=StreamStatus.FREIGHT_OVERCHARGED,
                        expected_amount=Decimal("0"),
                        actual_amount=leg[8],
                        difference=Decimal("0") - leg[8],
                        discrepancy_type_override="DUPLICATE_AWB_BILLING",
                        explanation=(
                            f"Duplicate AWB {awb} billed {duplicate_awbs[awb]} times "
                            f"across invoices; reclaim ₹{leg[8]} for {reference}."
                        ),
                        partner_id=order[5],
                        claimable=leg[8] > 0,
                        details={
                            "duplicate_awb": awb,
                            "billed_times": duplicate_awbs[awb],
                            "leg_amount": str(leg[8]),
                        },
                    )
                )

        summary = writer.commit()
        return {
            "total_source": len(orders),
            "total_target": len(freight_rows),
            **summary,
        }

    def _expected(self, book: RateCardBook, order, leg):
        """Rate-card price for one leg: base + cod% on COD orders; RTO uses multiplier.

        Returns (expected_price, cod_fee_computed) or (None, None) when no rate
        card matched — we never fabricate an expected price.
        """
        weight = leg[5] if leg[5] is not None else leg[6]
        is_rto = order[4] == OrderStatus.RTO
        base = book.expected_billed(
            leg[3], leg[7], leg[9], weight,
            rto_multiplier=self.params.rto_expected_multiplier if is_rto else None,
        )
        if base < 0:
            return None, None
        cod_fee = Decimal("0")
        if is_cod(order[6]):
            card = book.rate(leg[3], leg[7], leg[9], weight)
            if card is not None:
                cod_fee = (
                    order[3] * card.cod_charge_percent / Decimal("100")
                ).quantize(Decimal("0.01"))
        return (base + cod_fee).quantize(Decimal("0.01")), cod_fee

    def _orders(self):
        rows = self.db.execute(
            select(
                Order.id,
                Order.order_reference,
                Order.order_date,
                Order.net_amount,
                Order.status,
                Order.partner_id,
                Order.payment_method,
            ).where(Order.upload_id == self.run.source_upload_id)
        ).all()
        return [
            (
                r[0],
                r[1],
                r[2],
                r[3] if r[3] is not None else Decimal("0"),
                r[4],
                r[5],
                (r[6].strip().lower() if r[6] else None),
            )
            for r in rows
        ]

    def _freight(self):
        rows = self.db.execute(
            select(
                FreightRecord.id,
                FreightRecord.order_reference,
                FreightRecord.invoice_reference,
                FreightRecord.partner_id,
                FreightRecord.awb_number,
                FreightRecord.charged_weight_kg,
                FreightRecord.actual_weight_kg,
                FreightRecord.zone,
                FreightRecord.total_freight,
                FreightRecord.invoice_date,
                FreightRecord.freight_amount,
                FreightRecord.cod_charges,
            ).where(FreightRecord.upload_id == self.run.target_upload_id)
        ).all()
        return [
            (
                r[0],
                r[1],
                r[2],
                r[3],
                r[4],
                r[5] if r[5] is not None else Decimal("0"),
                r[6] if r[6] is not None else Decimal("0"),
                r[7],
                r[8] if r[8] is not None else Decimal("0"),
                r[9],
                r[10] if r[10] is not None else Decimal("0"),
                r[11] if r[11] is not None else Decimal("0"),
            )
            for r in rows
        ]
