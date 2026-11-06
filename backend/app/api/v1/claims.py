"""Claims API."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.database.connection import get_db
from app.models.user import User, UserRole
from app.models.discrepancy import Claim, ClaimStatus, Discrepancy

router = APIRouter(prefix="/claims", tags=["Claims"])


class ClaimCreateRequest(BaseModel):
    discrepancy_id: uuid.UUID
    claim_type: str
    notes: str | None = None


class ClaimUpdateRequest(BaseModel):
    status: str | None = None
    recovered_amount: Decimal | None = None
    notes: str | None = None


class ClaimResponse(BaseModel):
    id: uuid.UUID
    claim_reference: str
    discrepancy_id: uuid.UUID
    claim_type: str
    claim_amount: Decimal
    recovered_amount: Decimal
    status: str
    notes: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


def _generate_claim_ref() -> str:
    return f"CLM-{uuid.uuid4().hex[:8].upper()}"


@router.post("", response_model=ClaimResponse, status_code=201)
def create_claim(
    data: ClaimCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    disc = db.query(Discrepancy).filter(Discrepancy.id == data.discrepancy_id).first()
    if not disc:
        raise NotFoundException("Discrepancy not found")

    claim = Claim(
        discrepancy_id=disc.id, partner_id=disc.partner_id,
        created_by_id=user.id, claim_reference=_generate_claim_ref(),
        claim_type=data.claim_type, claim_amount=abs(disc.difference_amount),
        notes=data.notes, status=ClaimStatus.DRAFT,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return ClaimResponse.model_validate(claim)


@router.get("", response_model=list[ClaimResponse])
def list_claims(
    status: str | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), _=Depends(get_current_user),
):
    q = db.query(Claim).order_by(Claim.created_at.desc())
    if status:
        q = q.filter(Claim.status == ClaimStatus(status))
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return [ClaimResponse.model_validate(c) for c in items]


@router.patch("/{claim_id}", response_model=ClaimResponse)
def update_claim(
    claim_id: uuid.UUID, data: ClaimUpdateRequest,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise NotFoundException("Claim not found")

    # Only co-founders can approve/close claims
    if data.status in ("resolved", "closed") and user.role != UserRole.FINANCE_COFOUNDER:
        raise ForbiddenException("Only finance co-founders can resolve/close claims")

    if data.status:
        claim.status = ClaimStatus(data.status)
        if data.status == "submitted":
            claim.submitted_at = datetime.now(timezone.utc)
        elif data.status == "resolved":
            claim.resolved_at = datetime.now(timezone.utc)
        elif data.status == "closed":
            claim.closed_at = datetime.now(timezone.utc)
    if data.recovered_amount is not None:
        claim.recovered_amount = data.recovered_amount
    if data.notes is not None:
        claim.notes = data.notes
    db.commit()
    db.refresh(claim)
    return ClaimResponse.model_validate(claim)

