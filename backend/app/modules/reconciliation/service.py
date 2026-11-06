"""Reconciliation engine — deterministic financial matching and discrepancy detection."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundException
from app.models.order import Order
from app.models.settlement import Settlement
from app.models.reconciliation import (
    ReconciliationRun, ReconciliationResult,
    ReconStatus, ReconType, MatchMethod, MatchStatus,
)
from app.models.discrepancy import (
    Discrepancy, DiscrepancyType, DiscrepancySeverity, DiscrepancyStatus,
)

TOLERANCE = Decimal("1.00")  # ₹1 rounding tolerance


class ReconciliationService:
    def __init__(self, db: Session):
        self.db = db

    def create_run(
        self, name: str, recon_type: str, source_upload_id: uuid.UUID,
        target_upload_id: uuid.UUID, user_id: uuid.UUID,
    ) -> ReconciliationRun:
        run = ReconciliationRun(
            created_by_id=user_id, name=name,
            recon_type=ReconType(recon_type),
            source_upload_id=source_upload_id,
            target_upload_id=target_upload_id,
            status=ReconStatus.CREATED,
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def execute_settlement_reconciliation(self, run_id: uuid.UUID) -> ReconciliationRun:
        """Execute settlement reconciliation: orders vs settlements."""
        run = self.db.query(ReconciliationRun).filter(ReconciliationRun.id == run_id).first()
        if not run:
            raise NotFoundException(f"Run {run_id} not found")

        run.status = ReconStatus.RUNNING
        run.started_at = datetime.now(timezone.utc)
        self.db.commit()

        try:
            orders = self.db.query(Order).filter(Order.upload_id == run.source_upload_id).all()
            settlements = self.db.query(Settlement).filter(Settlement.upload_id == run.target_upload_id).all()

            # Build lookup: order_reference → list of settlements
            settlement_map: dict[str, list[Settlement]] = {}
            for s in settlements:
                settlement_map.setdefault(s.order_reference, []).append(s)

            run.total_source = len(orders)
            run.total_target = len(settlements)
            matched = 0
            unmatched = 0
            discrepancy_count = 0
            total_expected = Decimal("0")
            total_received = Decimal("0")
            total_discrepancy = Decimal("0")

            for order in orders:
                total_expected += order.net_amount
                matched_settlements = settlement_map.pop(order.order_reference, [])

                if matched_settlements:
                    # Exact match by order_reference
                    for stl in matched_settlements:
                        actual = stl.actual_received
                        expected = order.net_amount
                        diff = actual - expected
                        total_received += actual
                        total_discrepancy += diff

                        status = MatchStatus.MATCHED
                        if abs(diff) > TOLERANCE:
                            status = MatchStatus.PARTIAL

                        result = ReconciliationResult(
                            run_id=run.id, order_reference=order.order_reference,
                            source_record_id=order.id, target_record_id=stl.id,
                            match_method=MatchMethod.EXACT, match_status=status,
                            confidence_score=Decimal("1.0"),
                            expected_amount=expected, actual_amount=actual, difference=diff,
                        )
                        self.db.add(result)
                        matched += 1

                        # Create discrepancy if outside tolerance
                        if abs(diff) > TOLERANCE:
                            disc_type = DiscrepancyType.SHORT_PAYMENT if diff < 0 else DiscrepancyType.EXCESS_PAYMENT
                            severity = self._classify_severity(abs(diff))
                            disc = Discrepancy(
                                run_id=run.id, partner_id=order.partner_id,
                                order_reference=order.order_reference,
                                discrepancy_type=disc_type, severity=severity,
                                expected_amount=expected, actual_amount=actual,
                                difference_amount=diff,
                                explanation=f"Settlement difference of ₹{diff} for order {order.order_reference}",
                            )
                            self.db.add(disc)
                            discrepancy_count += 1
                else:
                    # Missing settlement
                    unmatched += 1
                    result = ReconciliationResult(
                        run_id=run.id, order_reference=order.order_reference,
                        source_record_id=order.id, target_record_id=None,
                        match_method=MatchMethod.EXACT, match_status=MatchStatus.UNMATCHED,
                        confidence_score=Decimal("0"),
                        expected_amount=order.net_amount, actual_amount=Decimal("0"),
                        difference=Decimal("0") - order.net_amount,
                    )
                    self.db.add(result)
                    disc = Discrepancy(
                        run_id=run.id, partner_id=order.partner_id,
                        order_reference=order.order_reference,
                        discrepancy_type=DiscrepancyType.MISSING_SETTLEMENT,
                        severity=DiscrepancySeverity.HIGH,
                        expected_amount=order.net_amount, actual_amount=Decimal("0"),
                        difference_amount=Decimal("0") - order.net_amount,
                        explanation=f"No settlement found for order {order.order_reference}",
                    )
                    self.db.add(disc)
                    discrepancy_count += 1

            # Update run summary
            run.matched_count = matched
            run.unmatched_count = unmatched
            run.discrepancy_count = discrepancy_count
            run.total_expected = total_expected
            run.total_received = total_received
            run.total_discrepancy = total_discrepancy
            run.status = ReconStatus.COMPLETED
            run.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(run)
            return run

        except Exception as e:
            run.status = ReconStatus.FAILED
            run.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            raise

    def get_run(self, run_id: uuid.UUID) -> ReconciliationRun:
        run = self.db.query(ReconciliationRun).filter(ReconciliationRun.id == run_id).first()
        if not run:
            raise NotFoundException(f"Reconciliation run {run_id} not found")
        return run

    def list_runs(self, page: int = 1, page_size: int = 50) -> tuple[list[ReconciliationRun], int]:
        q = self.db.query(ReconciliationRun).order_by(ReconciliationRun.created_at.desc())
        total = q.count()
        return q.offset((page - 1) * page_size).limit(page_size).all(), total

    def get_results(self, run_id: uuid.UUID) -> list[ReconciliationResult]:
        return self.db.query(ReconciliationResult).filter(ReconciliationResult.run_id == run_id).all()

    @staticmethod
    def _classify_severity(amount: Decimal) -> DiscrepancySeverity:
        if amount > Decimal("5000"):
            return DiscrepancySeverity.CRITICAL
        elif amount > Decimal("1000"):
            return DiscrepancySeverity.HIGH
        elif amount > Decimal("100"):
            return DiscrepancySeverity.MEDIUM
        return DiscrepancySeverity.LOW

