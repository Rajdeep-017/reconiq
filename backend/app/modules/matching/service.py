"""MatchingService — Phase D dispatcher and run bookkeeping.

Executes the right engine for a run's `recon_type`, deletes that run's previous
results/discrepancies/claims first (idempotent re-runs), bulk-writes the new
ones inside one transaction, and rolls up run counters.
"""
from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.discrepancy import Claim, Discrepancy
from app.models.reconciliation import (
    ReconStatus,
    ReconType,
    ReconciliationResult,
    ReconciliationRun,
)
from app.modules.matching.cod import CODEngine
from app.modules.matching.freight import FreightEngine
from app.modules.matching.returns import ReturnsEngine
from app.modules.matching.settlement import SettlementEngine
from app.modules.matching.params import load_params

log = logging.getLogger(__name__)


class MatchingService:
    ENGINES: dict[ReconType, type] = {
        ReconType.SETTLEMENT: SettlementEngine,
        ReconType.COD: CODEngine,
        ReconType.FREIGHT: FreightEngine,
        ReconType.RETURN: ReturnsEngine,
    }

    def __init__(self, db: Session):
        self.db = db

    def execute(
        self, run_id: uuid.UUID, as_of: date | None = None
    ) -> ReconciliationRun:
        run = self.db.query(ReconciliationRun).filter(ReconciliationRun.id == run_id).first()
        if not run:
            raise NotFoundException(f"Run {run_id} not found")

        engine_cls = self.ENGINES.get(run.recon_type)
        if engine_cls is None:
            raise NotFoundException(
                f"No matching engine implemented for recon_type '{run.recon_type}'"
            )

        run.status = ReconStatus.RUNNING
        run.started_at = datetime.now(timezone.utc)
        self.db.commit()

        try:
            # Idempotent re-runs: drop this run's previous output first.
            self._purge_previous(run.id)

            params = load_params(self.db, run.org_id)
            configured_as_of = (run.config or {}).get("as_of")
            effective_as_of = as_of or (
                date.fromisoformat(configured_as_of)
                if configured_as_of
                else date.today()
            )
            engine = engine_cls(self.db, run, params)
            summary = engine.execute(as_of=effective_as_of)

            run.total_source = summary.get("total_source", 0)
            run.total_target = summary.get("total_target", 0)
            run.matched_count = summary.get("matched_count", 0)
            run.unmatched_count = summary.get("unmatched_count", 0)
            run.discrepancy_count = summary.get("discrepancies", 0)
            run.total_expected = summary.get("total_expected", Decimal("0"))
            run.total_received = summary.get("total_received", Decimal("0"))
            run.total_discrepancy = summary.get("total_discrepancy", Decimal("0"))
            run.status = ReconStatus.COMPLETED
            run.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(run)
            log.info(
                "Run %s (%s): %s results, %s discrepancies, %s claims",
                run_id,
                run.recon_type.value,
                summary.get("results", 0),
                summary.get("discrepancies", 0),
                summary.get("claims", 0),
            )
            return run
        except Exception:
            self.db.rollback()
            run = self.db.query(ReconciliationRun).filter(ReconciliationRun.id == run_id).first()
            if run:
                run.status = ReconStatus.FAILED
                run.completed_at = datetime.now(timezone.utc)
                self.db.commit()
            raise

    def _purge_previous(self, run_id: uuid.UUID) -> None:
        disc_ids = select(Discrepancy.id).where(Discrepancy.run_id == run_id)
        self.db.query(Claim).filter(Claim.discrepancy_id.in_(disc_ids)).delete(
            synchronize_session=False
        )
        self.db.query(Discrepancy).filter(Discrepancy.run_id == run_id).delete(
            synchronize_session=False
        )
        self.db.query(ReconciliationResult).filter(
            ReconciliationResult.run_id == run_id
        ).delete(synchronize_session=False)
        self.db.flush()
