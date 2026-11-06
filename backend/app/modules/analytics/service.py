"""Analytics service — database aggregation for financial analytics."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import func, and_, extract
from sqlalchemy.orm import Session

from app.models.discrepancy import Discrepancy, DiscrepancyStatus, Claim
from app.models.order import Order
from app.models.reconciliation import ReconciliationResult, MatchStatus, ReconciliationRun
from app.models.settlement import Settlement, CODRemittance
from app.models.freight import FreightRecord
from app.models.organization import Organization


class AnalyticsService:
    """Database aggregation service for analytics endpoints."""

    def __init__(self, db: Session):
        self.db = db

    def settlement_trends(self, org_id: str | None = None, days: int = 30):
        """Expected vs received settlement over time."""
        since = datetime.utcnow() - timedelta(days=days)
        q = (
            self.db.query(
                func.date(Order.order_date).label("name"),
                func.sum(Order.net_amount).label("expected"),
                func.sum(Settlement.actual_received).label("received"),
            )
            .outerjoin(
                Settlement,
                and_(
                    Settlement.order_reference == Order.order_reference,
                    Settlement.org_id == Order.org_id,
                ),
            )
            .filter(Order.order_date >= since.date())
        )
        if org_id:
            q = q.filter(Order.org_id == org_id)
        q = q.group_by(func.date(Order.order_date)).order_by(func.date(Order.order_date))
        return q.all()

    def matching_trends(self, org_id: str | None = None, weeks: int = 4):
        """Matched vs unmatched orders over time."""
        since = datetime.utcnow() - timedelta(weeks=weeks)
        q = (
            self.db.query(
                func.date(ReconciliationResult.created_at).label("name"),
                func.sum(
                    func.case(
                        (ReconciliationResult.match_status == MatchStatus.MATCHED, 1),
                        else_=0,
                    )
                ).label("matched"),
                func.sum(
                    func.case(
                        (ReconciliationResult.match_status == MatchStatus.UNMATCHED, 1),
                        else_=0,
                    )
                ).label("unmatched"),
            )
            .filter(ReconciliationResult.created_at >= since)
        )
        if org_id:
            q = q.filter(ReconciliationResult.org_id == org_id)
        q = q.group_by(func.date(ReconciliationResult.created_at)).order_by(
            func.date(ReconciliationResult.created_at)
        )
        return q.all()

    def partner_performance(self, org_id: str | None = None):
        """Matching rate by marketplace partner."""
        q = (
            self.db.query(
                Order.partner_id.label("partner_id"),
                func.count(Order.id).label("total"),
                func.sum(
                    func.case(
                        (ReconciliationResult.match_status == MatchStatus.MATCHED, 1),
                        else_=0,
                    )
                ).label("matched"),
            )
            .outerjoin(
                ReconciliationResult,
                and_(
                    ReconciliationResult.order_reference == Order.order_reference,
                    ReconciliationResult.org_id == Order.org_id,
                ),
            )
            .group_by(Order.partner_id)
        )
        if org_id:
            q = q.filter(Order.org_id == org_id)
        return q.all()

    def partner_discrepancies(self, org_id: str | None = None):
        """Discrepancy value by partner."""
        q = (
            self.db.query(
                Discrepancy.partner_id.label("partner_id"),
                func.sum(func.abs(Discrepancy.difference_amount)).label("value"),
            )
            .group_by(Discrepancy.partner_id)
        )
        if org_id:
            q = q.filter(Discrepancy.org_id == org_id)
        return q.all()

    def freight_overcharge(self, org_id: str | None = None):
        """Freight overcharge analysis by partner."""
        q = (
            self.db.query(
                FreightRecord.partner_id.label("partner_id"),
                func.sum(
                    FreightRecord.charged_weight_kg * FreightRecord.rate_per_kg
                    - FreightRecord.freight_amount
                ).label("overcharge"),
            )
            .group_by(FreightRecord.partner_id)
        )
        if org_id:
            q = q.filter(FreightRecord.org_id == org_id)
        return q.all()

    def cod_remittance(self, org_id: str | None = None, days: int = 30):
        """COD remittance performance over time."""
        since = datetime.utcnow() - timedelta(days=days)
        q = (
            self.db.query(
                func.date(CODRemittance.remittance_date).label("name"),
                func.sum(CODRemittance.cod_amount).label("collected"),
                func.sum(CODRemittance.remitted_amount).label("remitted"),
            )
            .filter(CODRemittance.remittance_date >= since.date())
        )
        if org_id:
            q = q.filter(CODRemittance.org_id == org_id)
        q = q.group_by(func.date(CODRemittance.remittance_date)).order_by(
            func.date(CODRemittance.remittance_date)
        )
        return q.all()

    def return_refund(self, org_id: str | None = None):
        """Return/refund discrepancy analysis."""
        q = (
            self.db.query(
                func.case(
                    (Order.status == "returned", "processed"),
                    else_="pending",
                ).label("name"),
                func.count(Order.id).label("value"),
            )
            .group_by(func.case((Order.status == "returned", "processed"), else_="pending"))
        )
        if org_id:
            q = q.filter(Order.org_id == org_id)
        return q.all()

    def claim_recovery(self, org_id: str | None = None, days: int = 30):
        """Claim recovery trends over time."""
        since = datetime.utcnow() - timedelta(days=days)
        q = (
            self.db.query(
                func.date(Claim.created_at).label("name"),
                func.sum(Claim.recovered_amount).label("recovered"),
            )
            .filter(Claim.created_at >= since)
        )
        if org_id:
            q = q.filter(Claim.org_id == org_id)
        q = q.group_by(func.date(Claim.created_at)).order_by(
            func.date(Claim.created_at)
        )
        return q.all()

    def month_wise(self, org_id: str | None = None):
        """Month-wise reconciliation performance."""
        q = (
            self.db.query(
                func.to_char(ReconciliationRun.created_at, 'Mon').label("name"),
                func.sum(
                    func.case(
                        (ReconciliationResult.match_status == MatchStatus.MATCHED, 1),
                        else_=0,
                    )
                ).label("matched"),
                func.sum(
                    func.case(
                        (ReconciliationResult.match_status == MatchStatus.UNMATCHED, 1),
                        else_=0,
                    )
                ).label("unmatched"),
            )
            .outerjoin(
                ReconciliationResult,
                ReconciliationResult.run_id == ReconciliationRun.id,
            )
            .group_by(func.to_char(ReconciliationRun.created_at, 'Mon'))
        )
        if org_id:
            q = q.filter(ReconciliationRun.org_id == org_id)
        return q.all()
