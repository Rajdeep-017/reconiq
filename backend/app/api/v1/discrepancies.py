"""Discrepancies API — organization-scoped."""
from __future__ import annotations
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_organization, get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.database.connection import get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.discrepancy import Discrepancy, DiscrepancyStatus

router = APIRouter(prefix="/discrepancies", tags=["Discrepancies"])


class DiscrepancyResponse(BaseModel):
    id: UUID
    run_id: UUID
    order_reference: str
    discrepancy_type: str
    severity: str
    status: str
    expected_amount: Decimal
    actual_amount: Decimal
    difference_amount: Decimal
    explanation: str | None
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class DiscrepancyUpdateRequest(BaseModel):
    status: str
    resolution: str | None = None


@router.get("", response_model=list[DiscrepancyResponse])
def list_discrepancies(
    run_id: UUID | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
):
    q = db.query(Discrepancy).filter(Discrepancy.org_id == current_org.id)
    if run_id:
        q = q.filter(Discrepancy.run_id == run_id)
    if status:
        q = q.filter(Discrepancy.status == DiscrepancyStatus(status))
    items = q.order_by(Discrepancy.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return [DiscrepancyResponse.model_validate(d) for d in items]


@router.get("/{disc_id}", response_model=DiscrepancyResponse)
def get_discrepancy(
    disc_id: UUID,
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
):
    d = db.query(Discrepancy).filter(Discrepancy.id == disc_id).first()
    if not d:
        raise NotFoundException("Discrepancy not found")
    if d.org_id != current_org.id:
        raise ForbiddenException("Access denied: discrepancy belongs to a different organization")
    return DiscrepancyResponse.model_validate(d)


@router.patch("/{disc_id}", response_model=DiscrepancyResponse)
def update_discrepancy(
    disc_id: UUID,
    data: DiscrepancyUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
):
    d = db.query(Discrepancy).filter(Discrepancy.id == disc_id).first()
    if not d:
        raise NotFoundException("Discrepancy not found")
    if d.org_id != current_org.id:
        raise ForbiddenException("Access denied: discrepancy belongs to a different organization")
    d.status = DiscrepancyStatus(data.status)
    if data.resolution:
        d.resolution = data.resolution
    if data.status in ("resolved", "dismissed"):
        from datetime import datetime, timezone
        d.resolved_by_id = user.id
        d.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(d)
    return DiscrepancyResponse.model_validate(d)
