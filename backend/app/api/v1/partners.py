"""Partner API endpoints — organization-scoped."""
from __future__ import annotations
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_organization, get_current_user
from app.database.connection import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.partner import PartnerCreate, PartnerUpdate, PartnerResponse, PartnerListResponse
from app.services.partner import PartnerService

router = APIRouter(prefix="/partners", tags=["Partners"])


@router.post("", response_model=PartnerResponse, status_code=201)
def create_partner(
    data: PartnerCreate,
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
):
    return PartnerResponse.model_validate(
        PartnerService(db).create_partner(data, org_id=current_org.id)
    )


@router.get("", response_model=PartnerListResponse)
def list_partners(
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
):
    partners = PartnerService(db).list_partners(org_id=current_org.id)
    return PartnerListResponse(
        partners=[PartnerResponse.model_validate(p) for p in partners],
        total=len(partners),
    )


@router.get("/{partner_id}", response_model=PartnerResponse)
def get_partner(
    partner_id: UUID,
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
):
    p = PartnerService(db).get_partner(partner_id)
    if p.org_id != current_org.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Access denied: partner belongs to a different organization")
    return PartnerResponse.model_validate(p)


@router.patch("/{partner_id}", response_model=PartnerResponse)
def update_partner(
    partner_id: UUID,
    data: PartnerUpdate,
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
):
    p = PartnerService(db).get_partner(partner_id)
    if p.org_id != current_org.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Access denied: partner belongs to a different organization")
    return PartnerResponse.model_validate(
        PartnerService(db).update_partner(partner_id, data)
    )
