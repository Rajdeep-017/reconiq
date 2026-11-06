"""Mappings API endpoints — organization-scoped."""
from __future__ import annotations
from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_organization, get_current_user
from app.database.connection import get_db
from app.models.organization import Organization
from app.models.user import User
from app.modules.mapping.service import MappingService

router = APIRouter(prefix="/mappings", tags=["Mappings"])


class MappingSaveRequest(BaseModel):
    upload_id: UUID
    mappings: dict
    approved: bool = False


class MappingResponse(BaseModel):
    id: UUID
    upload_id: UUID
    version: int
    mappings: dict
    is_approved: bool
    model_config = {"from_attributes": True}


@router.get("/suggest/{upload_id}")
def suggest_mapping(
    upload_id: UUID,
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
):
    # Verify the upload belongs to the current org
    from app.models.upload import Upload
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(f"Upload {upload_id} not found")
    if upload.org_id != current_org.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Access denied: upload belongs to a different organization")
    return MappingService(db).suggest_mapping(upload_id)


@router.post("", response_model=MappingResponse, status_code=201)
def save_mapping(
    data: MappingSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
):
    # Verify the upload belongs to the current org
    from app.models.upload import Upload
    upload = db.query(Upload).filter(Upload.id == data.upload_id).first()
    if not upload:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(f"Upload {data.upload_id} not found")
    if upload.org_id != current_org.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Access denied: upload belongs to a different organization")

    m = MappingService(db).save_mapping(
        data.upload_id, data.mappings, current_user.id, data.approved, org_id=current_org.id
    )
    return MappingResponse.model_validate(m)


@router.get("/{upload_id}", response_model=MappingResponse | None)
def get_mapping(
    upload_id: UUID,
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
):
    # Verify the upload belongs to the current org
    from app.models.upload import Upload
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        return None
    if upload.org_id != current_org.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Access denied: upload belongs to a different organization")
    m = MappingService(db).get_mapping(upload_id)
    return MappingResponse.model_validate(m) if m else None
