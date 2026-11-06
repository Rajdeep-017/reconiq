"""Uploads API endpoints — organization-scoped."""
from __future__ import annotations
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session
from app.config import Settings, get_settings
from app.core.dependencies import get_current_organization, get_current_user
from app.database.connection import get_db
from app.models.organization import Organization
from app.models.user import User
from app.modules.ingestion.service import IngestionService
from app.schemas.upload import UploadResponse, UploadListResponse

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("", response_model=UploadResponse, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    partner_id: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
    settings: Settings = Depends(get_settings),
):
    content = await file.read()
    pid = UUID(partner_id) if partner_id else None
    svc = IngestionService(db, settings)
    upload = svc.upload_file(
        content,
        file.filename or "unknown",
        document_type,
        current_user.id,
        pid,
        org_id=current_org.id,
    )
    return UploadResponse.model_validate(upload)


@router.get("", response_model=UploadListResponse)
def list_uploads(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
    settings: Settings = Depends(get_settings),
):
    svc = IngestionService(db, settings)
    uploads, total = svc.list_uploads(page, page_size, org_id=current_org.id)
    return UploadListResponse(
        uploads=[UploadResponse.model_validate(u) for u in uploads],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{upload_id}", response_model=UploadResponse)
def get_upload(
    upload_id: UUID,
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization),
    settings: Settings = Depends(get_settings),
):
    upload = IngestionService(db, settings).get_upload(upload_id)
    if upload.org_id != current_org.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Access denied: upload belongs to a different organization")
    return UploadResponse.model_validate(upload)
