"""Dashboard API — financial metrics and analytics, organization-scoped."""
from __future__ import annotations
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_organization
from app.database.connection import get_db
from app.models.order import Order
from app.models.upload import Upload
from app.models.reconciliation import ReconciliationRun, ReconciliationResult, MatchStatus
from app.models.discrepancy import Discrepancy, DiscrepancyStatus, Claim, ClaimStatus
from app.models.organization import Organization

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardMetrics(BaseModel):
    total_uploads: int = 0
    total_orders: int = 0
    matched_orders: int = 0
    unmatched_orders: int = 0
    matching_rate: float = 0.0
    total_expected: Decimal = Decimal("0")
    total_received: Decimal = Decimal("0")
    total_discrepancy_value: Decimal = Decimal("0")
    verified_claimable: Decimal = Decimal("0")
    pending_recovery: Decimal = Decimal("0")
    recovered_amount: Decimal = Decimal("0")
    discrepancy_count: int = 0
    active_claims: int = 0


@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
):
    m = DashboardMetrics()

    m.total_uploads = (
        db.query(func.count(Upload.id))
        .filter(Upload.org_id == current_org.id)
        .scalar()
        or 0
    )
    m.total_orders = (
        db.query(func.count(Order.id))
        .filter(Order.org_id == current_org.id)
        .scalar()
        or 0
    )

    # From reconciliation results
    m.matched_orders = (
        db.query(func.count(ReconciliationResult.id))
        .filter(ReconciliationResult.org_id == current_org.id)
        .filter(ReconciliationResult.match_status == MatchStatus.MATCHED)
        .scalar()
        or 0
    )
    m.unmatched_orders = (
        db.query(func.count(ReconciliationResult.id))
        .filter(ReconciliationResult.org_id == current_org.id)
        .filter(ReconciliationResult.match_status == MatchStatus.UNMATCHED)
        .scalar()
        or 0
    )

    total = m.matched_orders + m.unmatched_orders
    m.matching_rate = round((m.matched_orders / total * 100) if total > 0 else 0, 2)

    # Financials from latest completed runs
    row = (
        db.query(
            func.sum(ReconciliationRun.total_expected),
            func.sum(ReconciliationRun.total_received),
            func.sum(ReconciliationRun.total_discrepancy),
        )
        .filter(ReconciliationRun.org_id == current_org.id)
        .filter(ReconciliationRun.status == "completed")
        .first()
    )

    if row and row[0]:
        m.total_expected = row[0]
        m.total_received = row[1] or Decimal("0")
        m.total_discrepancy_value = row[2] or Decimal("0")

    # Discrepancies
    m.discrepancy_count = (
        db.query(func.count(Discrepancy.id))
        .filter(Discrepancy.org_id == current_org.id)
        .scalar()
        or 0
    )

    m.verified_claimable = (
        db.query(func.coalesce(func.sum(func.abs(Discrepancy.difference_amount)), 0))
        .filter(Discrepancy.org_id == current_org.id)
        .filter(Discrepancy.status == DiscrepancyStatus.VERIFIED)
        .scalar()
    )

    # Claims
    m.active_claims = (
        db.query(func.count(Claim.id))
        .filter(Claim.org_id == current_org.id)
        .filter(Claim.status.notin_(["closed", "rejected"]))
        .scalar()
        or 0
    )
    m.pending_recovery = (
        db.query(func.coalesce(func.sum(Claim.claim_amount - Claim.recovered_amount), 0))
        .filter(Claim.org_id == current_org.id)
        .filter(Claim.status.notin_(["closed", "rejected", "draft"]))
        .scalar()
    )
    m.recovered_amount = (
        db.query(func.coalesce(func.sum(Claim.recovered_amount), 0))
        .filter(Claim.org_id == current_org.id)
        .filter(Claim.recovered_amount > 0)
        .scalar()
    )

    return m
