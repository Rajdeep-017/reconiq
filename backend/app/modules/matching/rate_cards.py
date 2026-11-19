"""Rate-card lookups used by the freight engine."""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.freight import RateCard


class RateCardBook:
    """Per-partner, per-zone, slab-indexed rate cards loaded once per run."""

    def __init__(self, cards: dict[uuid.UUID, list[RateCard]]):
        self._cards = cards
        self._misses: set[str] = set()

    @classmethod
    def load(cls, db: Session, org_id: uuid.UUID) -> "RateCardBook":
        rows = db.execute(select(RateCard).where(RateCard.org_id == org_id)).scalars().all()
        cards: dict[uuid.UUID, list[RateCard]] = {}
        for card in rows:
            cards.setdefault(card.partner_id, []).append(card)
        return cls(cards)

    def register_miss(self, key: str) -> None:
        self._misses.add(key)

    @property
    def misses(self) -> set[str]:
        return set(self._misses)

    def rate(
        self,
        partner_id: uuid.UUID | None,
        zone: str | None,
        billed_date: date | None,
        weight: Decimal,
    ) -> RateCard | None:
        if partner_id is None:
            return None
        cards = self._cards.get(partner_id)
        if not cards:
            return None
        weight = Decimal(weight or 0)
        for card in cards:
            if zone and (card.zone or "").upper() != zone.upper():
                continue
            if billed_date and card.effective_from and billed_date < card.effective_from:
                continue
            if billed_date and card.effective_to and billed_date > card.effective_to:
                continue
            if card.weight_slab_min_kg <= weight <= card.weight_slab_max_kg:
                return card
        self.register_miss(f"{partner_id}|{zone}|{billed_date}|{weight}")
        return None

    def expected_billed(
        self,
        partner_id: uuid.UUID | None,
        zone: str | None,
        billed_date: date | None,
        charged_weight: Decimal | None,
        rto_multiplier: Decimal | None = None,
    ) -> Decimal:
        """Return the forward (or RTO-adjusted) rate-card price for one leg."""
        card = self.rate(
            partner_id, zone, billed_date, charged_weight or Decimal("0")
        )
        if card is None:
            return Decimal("-1")  # sentinel: no usable rate card
        weight = Decimal(charged_weight or 0)
        base = (
            weight * card.rate_per_kg + card.fixed_charge
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if rto_multiplier is not None:
            base = (base * rto_multiplier).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        return base

    def cod_charge_percent(self, card: RateCard) -> Decimal:
        return card.cod_charge_percent if card is not None else Decimal("0")
