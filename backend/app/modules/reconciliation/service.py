"""Reconciliation engine — deterministic financial matching and discrepancy detection."""
from __future__ import annotations
import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundException
from app.modules.matching.service import MatchingService
from app.models.reconciliation import (
    ReconciliationRun, ReconciliationResult,
    ReconStatus, ReconType,
)
from app.models.discrepancy import DiscrepancySeverity


class ReconciliationService:
    def __init__(self, db: Session):
        self.db = db

    def create_run(
        self,
        name: str,
        recon_type: str,
        source_upload_id: uuid.UUID,
        target_upload_id: uuid.UUID,
        user_id: uuid.UUID,
        org_id: uuid.UUID | None = None,
        as_of: date | None = None,
    ) -> ReconciliationRun:
        run = ReconciliationRun(
            org_id=org_id,
            created_by_id=user_id,
            name=name,
            recon_type=ReconType(recon_type),
            source_upload_id=source_upload_id,
            target_upload_id=target_upload_id,
            status=ReconStatus.CREATED,
            config={"as_of": as_of.isoformat()} if as_of else None,
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def execute_run(
        self, run_id: uuid.UUID, as_of: date | None = None
    ) -> ReconciliationRun:
        """Execute a reconciliation run via the Phase D matching engines.

        Dispatches on ``recon_type``: settlement / cod / freight / return.
        """
        return MatchingService(self.db).execute(run_id, as_of=as_of)

    def execute_settlement_reconciliation(
        self, run_id: uuid.UUID, as_of: date | None = None
    ) -> ReconciliationRun:
        """Back-compat alias — now dispatches through the matching engines."""
        return self.execute_run(run_id, as_of=as_of)

    def get_run(self, run_id: uuid.UUID) -> ReconciliationRun:
        run = self.db.query(ReconciliationRun).filter(ReconciliationRun.id == run_id).first()
        if not run:
            raise NotFoundException(f"Reconciliation run {run_id} not found")
        return run

    def list_runs(
        self, page: int = 1, page_size: int = 50, org_id: uuid.UUID | None = None
    ) -> tuple[list[ReconciliationRun], int]:
        q = self.db.query(ReconciliationRun)
        if org_id is not None:
            q = q.filter(ReconciliationRun.org_id == org_id)
        q = q.order_by(ReconciliationRun.created_at.desc())
        total = q.count()
        return q.offset((page - 1) * page_size).limit(page_size).all(), total

    def get_results(self, run_id: uuid.UUID) -> list[ReconciliationResult]:
        return (
            self.db.query(ReconciliationResult)
            .filter(ReconciliationResult.run_id == run_id)
            .all()
        )

    @staticmethod
    def _classify_severity(amount: Decimal) -> DiscrepancySeverity:
        if amount > Decimal("5000"):
            return DiscrepancySeverity.CRITICAL
        elif amount > Decimal("1000"):
            return DiscrepancySeverity.HIGH
        elif amount > Decimal("100"):
            return DiscrepancySeverity.MEDIUM
        return DiscrepancySeverity.LOW
