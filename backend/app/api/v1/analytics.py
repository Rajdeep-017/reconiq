"""Analytics API endpoints — organization-scoped financial analytics."""
from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_organization
from app.database.connection import get_db
from app.models.organization import Organization
from app.modules.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/settlement-trends")
def settlement_trends(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
) -> list[dict[str, Any]]:
    """Expected vs received settlement over time."""
    rows = AnalyticsService(db).settlement_trends(org_id=str(current_org.id), days=days)
    return [
        {
            "name": str(r.name) if r.name else "",
            "expected": float(r.expected or 0),
            "received": float(r.received or 0),
        }
        for r in rows
    ]


@router.get("/matching-trends")
def matching_trends(
    weeks: int = Query(4, ge=1, le=52),
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
) -> list[dict[str, Any]]:
    """Matched vs unmatched orders over time."""
    rows = AnalyticsService(db).matching_trends(org_id=str(current_org.id), weeks=weeks)
    return [
        {
            "name": str(r.name) if r.name else "",
            "matched": int(r.matched or 0),
            "unmatched": int(r.unmatched or 0),
        }
        for r in rows
    ]


@router.get("/partner-performance")
def partner_performance(
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
) -> list[dict[str, Any]]:
    """Matching rate by marketplace partner."""
    rows = AnalyticsService(db).partner_performance(org_id=str(current_org.id))
    result = []
    for r in rows:
        total = int(r.total or 0)
        matched = int(r.matched or 0)
        rate = round((matched / total * 100) if total > 0 else 0, 2)
        # Get partner name
        from app.models.partner import Partner
        partner = db.query(Partner).filter(Partner.id == r.partner_id).first()
        partner_name = partner.name if partner else "Unknown"
        result.append({"name": partner_name, "rate": rate})
    return result


@router.get("/partner-discrepancies")
def partner_discrepancies(
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
) -> list[dict[str, Any]]:
    """Discrepancy value by partner."""
    rows = AnalyticsService(db).partner_discrepancies(org_id=str(current_org.id))
    result = []
    for r in rows:
        from app.models.partner import Partner
        partner = db.query(Partner).filter(Partner.id == r.partner_id).first()
        partner_name = partner.name if partner else "Unknown"
        result.append({"name": partner_name, "value": float(r.value or 0)})
    return result


@router.get("/freight-overcharge")
def freight_overcharge(
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
) -> list[dict[str, Any]]:
    """Freight overcharge analysis by partner."""
    rows = AnalyticsService(db).freight_overcharge(org_id=str(current_org.id))
    result = []
    for r in rows:
        from app.models.partner import Partner
        partner = db.query(Partner).filter(Partner.id == r.partner_id).first()
        partner_name = partner.name if partner else "Unknown"
        result.append({"name": partner_name, "overcharge": float(r.overcharge or 0)})
    return result


@router.get("/cod-remittance")
def cod_remittance(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
) -> list[dict[str, Any]]:
    """COD remittance performance over time."""
    rows = AnalyticsService(db).cod_remittance(org_id=str(current_org.id), days=days)
    return [
        {
            "name": str(r.name) if r.name else "",
            "collected": float(r.collected or 0),
            "remitted": float(r.remitted or 0),
        }
        for r in rows
    ]


@router.get("/return-refund")
def return_refund(
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
) -> list[dict[str, Any]]:
    """Return/refund discrepancy analysis."""
    rows = AnalyticsService(db).return_refund(org_id=str(current_org.id))
    return [
        {"name": str(r.name or "pending"), "value": int(r.value or 0)}
        for r in rows
    ]


@router.get("/claim-recovery")
def claim_recovery(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
) -> list[dict[str, Any]]:
    """Claim recovery trends over time."""
    rows = AnalyticsService(db).claim_recovery(org_id=str(current_org.id), days=days)
    return [
        {
            "name": str(r.name) if r.name else "",
            "recovered": float(r.recovered or 0),
        }
        for r in rows
    ]


@router.get("/month-wise")
def month_wise(
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
) -> list[dict[str, Any]]:
    """Month-wise reconciliation performance."""
    rows = AnalyticsService(db).month_wise(org_id=str(current_org.id))
    return [
        {
            "name": str(r.name or ""),
            "matched": int(r.matched or 0),
            "unmatched": int(r.unmatched or 0),
        }
        for r in rows
    ]
