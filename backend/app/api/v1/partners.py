"""Partner API endpoints."""
from __future__ import annotations
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.schemas.partner import PartnerCreate, PartnerUpdate, PartnerResponse, PartnerListResponse
from app.services.partner import PartnerService

router = APIRouter(prefix="/partners", tags=["Partners"])


@router.post("", response_model=PartnerResponse, status_code=201)
def create_partner(
    data: PartnerCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return PartnerResponse.model_validate(PartnerService(db).create_partner(data))


@router.get("", response_model=PartnerListResponse)
def list_partners(db: Session = Depends(get_db), _=Depends(get_current_user)):
    partners = PartnerService(db).list_partners()
    return PartnerListResponse(
        partners=[PartnerResponse.model_validate(p) for p in partners],
        total=len(partners),
    )


@router.get("/{partner_id}", response_model=PartnerResponse)
def get_partner(partner_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return PartnerResponse.model_validate(PartnerService(db).get_partner(partner_id))


@router.patch("/{partner_id}", response_model=PartnerResponse)
def update_partner(
    partner_id: UUID,
    data: PartnerUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return PartnerResponse.model_validate(PartnerService(db).update_partner(partner_id, data))

