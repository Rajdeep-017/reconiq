"""Reconciliation API endpoints."""
from __future__ import annotations
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.modules.reconciliation.service import ReconciliationService

router = APIRouter(prefix="/reconciliation", tags=["Reconciliation"])


class ReconRunCreate(BaseModel):
    name: str
    recon_type: str
    source_upload_id: UUID
    target_upload_id: UUID


class ReconRunResponse(BaseModel):
    id: UUID
    name: str
    recon_type: str
    status: str
    total_source: int
    total_target: int
    matched_count: int
    unmatched_count: int
    discrepancy_count: int
    total_expected: Decimal
    total_received: Decimal
    total_discrepancy: Decimal
    model_config = {"from_attributes": True}


class ReconResultResponse(BaseModel):
    id: UUID
    run_id: UUID
    order_reference: str
    match_method: str
    match_status: str
    confidence_score: Decimal
    expected_amount: Decimal
    actual_amount: Decimal
    difference: Decimal
    model_config = {"from_attributes": True}


@router.post("", response_model=ReconRunResponse, status_code=201)
def create_run(data: ReconRunCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    run = ReconciliationService(db).create_run(
        data.name, data.recon_type, data.source_upload_id, data.target_upload_id, user.id)
    return ReconRunResponse.model_validate(run)


@router.post("/{run_id}/execute", response_model=ReconRunResponse)
def execute_run(run_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return ReconRunResponse.model_validate(
        ReconciliationService(db).execute_settlement_reconciliation(run_id))


@router.get("", response_model=list[ReconRunResponse])
def list_runs(page: int = Query(1, ge=1), db: Session = Depends(get_db), _=Depends(get_current_user)):
    runs, _ = ReconciliationService(db).list_runs(page)
    return [ReconRunResponse.model_validate(r) for r in runs]


@router.get("/{run_id}", response_model=ReconRunResponse)
def get_run(run_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return ReconRunResponse.model_validate(ReconciliationService(db).get_run(run_id))


@router.get("/{run_id}/results", response_model=list[ReconResultResponse])
def get_results(run_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [ReconResultResponse.model_validate(r) for r in ReconciliationService(db).get_results(run_id)]

