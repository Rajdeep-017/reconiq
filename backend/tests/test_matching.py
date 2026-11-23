"""Phase D matching engines — deterministic statuses, discrepancies, claims.

Covers:
* settlement engine: settled / short_paid / unpaid_past_due / not_yet_due /
  settled_late, ₹10 boundary (exactly −10 stays settled, −10.01 flags)
* COD engine: unremitted / short / late / prepaid-ignored / cancelled-advisory
* freight engine: rate-card overcharge, duplicate AWB billing,
  missing freight invoice, no-rate-card grace
* returns engine: return_not_received with refund claim, scan-window boundary
  (7 days), in-transit → not_yet_due
* run bookkeeping: counters, claims created from discrepancies, idempotent
  re-execution via MatchingService
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.models.discrepancy import Claim, Discrepancy, DiscrepancyType
from app.models.freight import FreightRecord, RateCard
from app.models.order import (
    Order,
    OrderStatus,
    RefundStatus,
    Return,
    ReturnStatus,
    WarehouseScan,
)
from app.models.partner import Partner
from app.models.organization import Organization
from app.models.reconciliation import ReconciliationRun, ReconStatus, ReconType
from app.models.settlement import CODRemittance, Settlement
from app.models.upload import DocumentType, Upload, UploadStatus
from app.models.user import User
from app.modules.matching.service import MatchingService


# --------------------------------------------------------------------------- helpers

def make_org(db) -> Organization:
    org = Organization(
        id=uuid.uuid4(),
        name=f"Org-{uuid.uuid4().hex[:8]}",
        slug=f"org-{uuid.uuid4().hex[:8]}",
        is_active=True,
    )
    db.add(org)
    db.flush()
    return org


def make_user(db, org: Organization) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"u{uuid.uuid4().hex[:8]}@example.com",
        full_name="Run Owner",
        hashed_password="x",
        role="finance_cofounder",
        is_active=True,
        org_id=org.id,
    )
    db.add(user)
    db.flush()
    return user


def make_upload(db, org: Organization, user: User, document_type: str) -> Upload:
    upload = Upload(
        id=uuid.uuid4(),
        org_id=org.id,
        uploaded_by_id=user.id,
        original_filename=f"{document_type}.csv",
        stored_filename=f"{document_type}-stored.csv",
        file_type="csv",
        document_type=DocumentType(document_type),
        file_size=100,
        sha256_checksum=uuid.uuid4().hex,
        status=UploadStatus.PROCESSED,
    )
    db.add(upload)
    db.flush()
    return upload


def make_run(db, org: Organization, user: User, recon_type: str, source: Upload, target: Upload) -> ReconciliationRun:
    run = ReconciliationRun(
        id=uuid.uuid4(),
        org_id=org.id,
        created_by_id=user.id,
        name=f"run-{uuid.uuid4().hex[:6]}",
        recon_type=ReconType(recon_type),
        source_upload_id=source.id,
        target_upload_id=target.id,
        status=ReconStatus.CREATED,
        config={"as_of": "2026-11-08"},
    )
    db.add(run)
    db.flush()
    return run


def make_order(db, org: Organization, upload: Upload, reference: str, **kw) -> Order:
    base = dict(
        order_reference=reference,
        status=OrderStatus.DELIVERED,
        payment_method="prepaid",
        net_amount=Decimal("1000"),
        gross_amount=Decimal("1200"),
        order_date=date(2024, 9, 1),
    )
    base.update(kw)
    order = Order(
        id=uuid.uuid4(),
        org_id=org.id,
        upload_id=upload.id,
        order_reference=base["order_reference"],
        status=base["status"],
        payment_method=base["payment_method"],
        net_amount=base["net_amount"],
        gross_amount=base["gross_amount"],
        order_date=base["order_date"],
    )
    db.add(order)
    db.flush()
    return order


def get_result(db, run_id: uuid.UUID, reference: str):
    from app.models.reconciliation import ReconciliationResult

    return (
        db.query(ReconciliationResult)
        .filter(ReconciliationResult.run_id == run_id)
        .filter(ReconciliationResult.order_reference == reference)
        .first()
    )


def get_discrepancy(db, run_id: uuid.UUID, reference: str, type_value: str):
    return (
        db.query(Discrepancy)
        .filter(Discrepancy.run_id == run_id)
        .filter(Discrepancy.order_reference == reference)
        .filter(Discrepancy.discrepancy_type == type_value)
        .first()
    )


def get_claim(db, run_id: uuid.UUID, reference: str):
    return (
        db.query(Claim)
        .join(Discrepancy, Claim.discrepancy_id == Discrepancy.id)
        .filter(Discrepancy.run_id == run_id)
        .filter(Discrepancy.order_reference == reference)
        .first()
    )


# --------------------------------------------------------------------------- settlement


@pytest.fixture()
def settlement_env(db):
    org = make_org(db)
    user = make_user(db, org)
    orders_up = make_upload(db, org, user, "orders")
    settle_up = make_upload(db, org, user, "settlements")

    settled = make_order(
        db, org, orders_up, "ORD-SETTLED",
        gross_amount=Decimal("1499"),
        net_amount=Decimal("1349"),
        order_date=date(2024, 9, 25),
    )
    short = make_order(db, org, orders_up, "ORD-SHORT", net_amount=Decimal("400"))
    missing = make_order(db, org, orders_up, "ORD-MISSING", net_amount=Decimal("999"), order_date=date(2024, 9, 1))
    fresh = make_order(db, org, orders_up, "ORD-FRESH", net_amount=Decimal("500"), order_date=date(2026, 11, 1))

    db.add(
        Settlement(
            id=uuid.uuid4(), org_id=org.id, upload_id=settle_up.id,
            settlement_reference="STL-1", order_reference=settled.order_reference,
            settlement_date=date(2024, 10, 5), transaction_type="regular",
            gross_amount=Decimal("1349"), commission=Decimal("202.35"),
            shipping_fee=Decimal("62.88"), other_fees=Decimal("31.60"),
            tcs_deducted=Decimal("13.49"), tds_deducted=Decimal("13.49"),
            actual_received=Decimal("1025.19"),
        )
    )
    db.add(
        Settlement(
            id=uuid.uuid4(), org_id=org.id, upload_id=settle_up.id,
            settlement_reference="STL-2", order_reference=short.order_reference,
            settlement_date=date(2024, 10, 6), transaction_type="regular",
            gross_amount=Decimal("400"), commission=Decimal("0"),
            shipping_fee=Decimal("0"), other_fees=Decimal("0"),
            tcs_deducted=Decimal("0"), tds_deducted=Decimal("0"),
            actual_received=Decimal("300"),  # gap = −100 → short_paid
        )
    )
    db.flush()

    run = make_run(db, org, user, "settlement", orders_up, settle_up)
    return {
        "db": db, "org": org, "user": user, "run": run,
        "orders": [settled, short, missing, fresh],
        "orders_upload": orders_up,
        "settlements_upload": settle_up,
    }


def test_settlement_statuses_and_claims(settlement_env):
    env = settlement_env
    db = env["db"]
    run = MatchingService(db).execute(env["run"].id)
    db.flush()

    assert run.status == ReconStatus.COMPLETED
    assert run.total_source == 4
    assert run.total_target == 2

    settled = get_result(db, run.id, "ORD-SETTLED")
    assert settled.stream_status == "settled"
    # received = 1025.19 + 13.49 + 13.49 = 1052.17; expected = 1349 − 202.35 − 62.88 − 31.60
    assert settled.expected_amount == Decimal("1052.17")
    assert settled.actual_amount == Decimal("1052.17")
    assert settled.difference == Decimal("0.00")
    assert get_discrepancy(db, run.id, "ORD-SETTLED", "short_paid") is None

    short = get_result(db, run.id, "ORD-SHORT")
    assert short.stream_status == "short_paid"
    assert short.difference == Decimal("-100.00")
    disc = get_discrepancy(db, run.id, "ORD-SHORT", "short_paid")
    assert disc is not None and disc.severity.value == "medium"
    claim = get_claim(db, run.id, "ORD-SHORT")
    assert claim is not None and claim.claim_amount == Decimal("100.00")
    assert claim.status.value == "draft"

    missing = get_result(db, run.id, "ORD-MISSING")
    assert missing.stream_status == "unpaid_past_due"
    assert missing.difference == Decimal("-999.00")
    claim = get_claim(db, run.id, "ORD-MISSING")
    assert claim is not None and claim.claim_amount == Decimal("999.00")

    fresh = get_result(db, run.id, "ORD-FRESH")
    assert fresh.stream_status == "not_yet_due"
    assert get_discrepancy(db, run.id, "ORD-FRESH", "unpaid_past_due") is None

    assert run.matched_count == 1  # only ORD-SETTLED is MATCHED
    assert run.discrepancy_count == 2  # short_paid + unpaid_past_due


def test_settlement_ruppee10_boundary(db):
    org = make_org(db)
    user = make_user(db, org)
    orders_up = make_upload(db, org, user, "orders")
    settle_up = make_upload(db, org, user, "settlements")

    at_limit = make_order(
        db, org, orders_up, "ORD-AT", net_amount=Decimal("100"), order_date=date(2024, 9, 25)
    )
    over_limit = make_order(
        db, org, orders_up, "ORD-OVER", net_amount=Decimal("100"), order_date=date(2024, 9, 25)
    )

    db.add(
        Settlement(
            id=uuid.uuid4(), org_id=org.id, upload_id=settle_up.id,
            settlement_reference="S-AT", order_reference=at_limit.order_reference,
            settlement_date=date(2024, 10, 5),
            gross_amount=Decimal("100"), actual_received=Decimal("90"),
        )
    )
    db.add(
        Settlement(
            id=uuid.uuid4(), org_id=org.id, upload_id=settle_up.id,
            settlement_reference="S-OVER", order_reference=over_limit.order_reference,
            settlement_date=date(2024, 10, 5),
            gross_amount=Decimal("100"), actual_received=Decimal("89.99"),
        )
    )
    run = make_run(db, org, user, "settlement", orders_up, settle_up)
    db.flush()

    MatchingService(db).execute(run.id)
    db.flush()

    # gap exactly −10 → settled; −10.01 → short_paid
    assert get_result(db, run.id, "ORD-AT").stream_status == "settled"
    assert get_result(db, run.id, "ORD-OVER").stream_status == "short_paid"
    assert get_discrepancy(db, run.id, "ORD-AT", "short_paid") is None
    assert get_discrepancy(db, run.id, "ORD-OVER", "short_paid") is not None


def test_settlement_late(db):
    org = make_org(db)
    user = make_user(db, org)
    orders_up = make_upload(db, org, user, "orders")
    settle_up = make_upload(db, org, user, "settlements")

    late = make_order(db, org, orders_up, "ORD-LATE", order_date=date(2024, 9, 1))
    db.add(
        Settlement(
            id=uuid.uuid4(), org_id=org.id, upload_id=settle_up.id,
            settlement_reference="S-LATE", order_reference=late.order_reference,
            settlement_date=date(2024, 9, 20),  # 19 days later → late (> 15)
            gross_amount=Decimal("1000"), actual_received=Decimal("1000"),
        )
    )
    ontime = make_order(db, org, orders_up, "ORD-ONTIME", order_date=date(2024, 9, 1))
    db.add(
        Settlement(
            id=uuid.uuid4(), org_id=org.id, upload_id=settle_up.id,
            settlement_reference="S-ON", order_reference=ontime.order_reference,
            settlement_date=date(2024, 9, 10),
            gross_amount=Decimal("1000"), actual_received=Decimal("1000"),
        )
    )
    run = make_run(db, org, user, "settlement", orders_up, settle_up)
    db.flush()

    MatchingService(db).execute(run.id)
    db.flush()

    assert get_result(db, run.id, "ORD-LATE").stream_status == "settled_late"
    assert get_result(db, run.id, "ORD-ONTIME").stream_status == "settled"
    late_disc = get_discrepancy(db, run.id, "ORD-LATE", "settled_late")
    assert late_disc is not None
    # A late settlement with no monetary gap is advisory only. The writer
    # never creates zero-value claims; reviewers can raise a delay claim
    # manually from the discrepancy if their process requires one.
    assert get_claim(db, run.id, "ORD-LATE") is None


# --------------------------------------------------------------------------- cod


@pytest.fixture()
def cod_env(db):
    org = make_org(db)
    user = make_user(db, org)
    orders_up = make_upload(db, org, user, "orders")
    cod_up = make_upload(db, org, user, "cod_remittances")

    missing = make_order(db, org, orders_up, "ORD-COD-MISS", payment_method="cod", net_amount=Decimal("1190"))
    short = make_order(db, org, orders_up, "ORD-COD-SHORT", payment_method="cod", net_amount=Decimal("1190"))
    late = make_order(db, org, orders_up, "ORD-COD-LATE", payment_method="cod", net_amount=Decimal("1190"))
    cancelled = make_order(
        db, org, orders_up, "ORD-COD-CANCEL",
        payment_method="cod", net_amount=Decimal("700"), status=OrderStatus.CANCELLED,
    )
    prepaid = make_order(db, org, orders_up, "ORD-PREPAID", payment_method="prepaid")

    db.add_all(
        [
            CODRemittance(
                id=uuid.uuid4(), org_id=org.id, upload_id=cod_up.id,
                remittance_reference="REM-1", order_reference=short.order_reference,
                remittance_date=date(2024, 9, 20),
                cod_amount=Decimal("1190"), remitted_amount=Decimal("0"),
            ),
            CODRemittance(
                id=uuid.uuid4(), org_id=org.id, upload_id=cod_up.id,
                remittance_reference="REM-2", order_reference=late.order_reference,
                remittance_date=date(2024, 10, 3),  # 32 days after order → late
                cod_amount=Decimal("1190"), remitted_amount=Decimal("1190"),
            ),
        ]
    )
    run = make_run(db, org, user, "cod", orders_up, cod_up)
    db.flush()
    return {"db": db, "run": run, "orders": [missing, short, late, cancelled, prepaid]}


def test_cod_statuses(cod_env):
    db = cod_env["db"]
    run = MatchingService(db).execute(cod_env["run"].id)
    db.flush()

    assert run.total_source == 4  # all COD orders; prepaid is excluded
    assert run.total_target == 2

    missing = get_result(db, run.id, "ORD-COD-MISS")
    assert missing.stream_status == "unpaid_past_due"
    claim = get_claim(db, run.id, "ORD-COD-MISS")
    assert claim is not None and claim.claim_amount == Decimal("1190.00")

    short = get_result(db, run.id, "ORD-COD-SHORT")
    assert short.stream_status == "short_paid"
    assert short.expected_amount == Decimal("1190")  # from remittance row cod_amount
    assert short.actual_amount == Decimal("0")
    assert get_claim(db, run.id, "ORD-COD-SHORT") is not None

    late = get_result(db, run.id, "ORD-COD-LATE")
    assert late.stream_status == "settled_late"
    # Late but fully remitted: advisory, no zero-value claim.
    assert get_claim(db, run.id, "ORD-COD-LATE") is None

    cancelled = get_result(db, run.id, "ORD-COD-CANCEL")
    assert cancelled is not None
    assert cancelled.stream_status == "unpaid_past_due"
    cancelled_disc = get_discrepancy(
        db, run.id, "ORD-COD-CANCEL", "unpaid_past_due"
    )
    assert cancelled_disc is not None
    # Cash was never collected, so this stays advisory and creates no claim.
    assert get_claim(db, run.id, "ORD-COD-CANCEL") is None

    assert get_result(db, run.id, "ORD-PREPAID") is None


def test_cod_not_yet_due(db):
    org = make_org(db)
    user = make_user(db, org)
    orders_up = make_upload(db, org, user, "orders")
    cod_up = make_upload(db, org, user, "cod_remittances")
    make_order(
        db, org, orders_up, "ORD-COD-FRESH",
        payment_method="cod", order_date=date.today() - timedelta(days=2),
    )
    run = make_run(db, org, user, "cod", orders_up, cod_up)
    db.flush()

    MatchingService(db).execute(run.id)
    db.flush()
    result = get_result(db, run.id, "ORD-COD-FRESH")
    assert result.stream_status == "not_yet_due"
    assert (
        db.query(func.count(Discrepancy.id))
        .filter(Discrepancy.run_id == run.id)
        .scalar()
        == 0
    )


# --------------------------------------------------------------------------- freight


@pytest.fixture()
def freight_env(db):
    org = make_org(db)
    user = make_user(db, org)
    orders_up = make_upload(db, org, user, "orders")
    freight_up = make_upload(db, org, user, "freight_invoices")

    courier = Partner(
        id=uuid.uuid4(),
        org_id=org.id,
        name=f"Courier P{uuid.uuid4().hex[:6]}",
        code=f"CP{uuid.uuid4().hex[:6]}",
        partner_type="courier",
        is_active=True,
    )
    db.add(courier)
    db.flush()

    for zone in ("A", "B"):
        db.add(
            RateCard(
                id=uuid.uuid4(), org_id=org.id, partner_id=courier.id,
                name=f"card-{zone}",
                zone=zone,
                weight_slab_min_kg=Decimal("0"), weight_slab_max_kg=Decimal("1"),
                rate_per_kg=Decimal("30"), fixed_charge=Decimal("20"),
                cod_charge_percent=Decimal("2"),
                effective_from=date(2024, 1, 1), effective_to=None,
            )
        )
    db.flush()

    over = make_order(db, org, orders_up, "ORD-FRT-OVER")
    ok = make_order(db, org, orders_up, "ORD-FRT-OK")
    dup = make_order(db, org, orders_up, "ORD-FRT-DUP")
    gone = make_order(db, org, orders_up, "ORD-FRT-GONE")  # no freight row
    friendly = make_order(db, org, orders_up, "ORD-FRT-NORATE")  # zone E, no card

    db.add_all(
        [
            FreightRecord(
                id=uuid.uuid4(), org_id=org.id, upload_id=freight_up.id,
                partner_id=courier.id, invoice_reference="INV-1",
                order_reference=over.order_reference, awb_number="AWB-100",
                invoice_date=date(2024, 9, 20), zone="A",
                actual_weight_kg=Decimal("0.5"), charged_weight_kg=Decimal("0.5"),
                rate_per_kg=Decimal("100"), freight_amount=Decimal("90"),
                cod_charges=Decimal("0"), total_freight=Decimal("100"),
            ),
            FreightRecord(
                id=uuid.uuid4(), org_id=org.id, upload_id=freight_up.id,
                partner_id=courier.id, invoice_reference="INV-2",
                order_reference=ok.order_reference, awb_number="AWB-200",
                invoice_date=date(2024, 9, 20), zone="B",
                actual_weight_kg=Decimal("1.0"), charged_weight_kg=Decimal("0.4"),
                rate_per_kg=Decimal("30"), freight_amount=Decimal("40"),
                cod_charges=Decimal("0"), total_freight=Decimal("40"),
            ),
            FreightRecord(
                id=uuid.uuid4(), org_id=org.id, upload_id=freight_up.id,
                partner_id=courier.id, invoice_reference="INV-3",
                order_reference=dup.order_reference, awb_number="AWB-DUP",
                invoice_date=date(2024, 9, 20), zone="A",
                actual_weight_kg=Decimal("0.5"), charged_weight_kg=Decimal("0.5"),
                rate_per_kg=Decimal("30"), freight_amount=Decimal("35"),
                cod_charges=Decimal("0"), total_freight=Decimal("35"),
            ),
            FreightRecord(
                id=uuid.uuid4(), org_id=org.id, upload_id=freight_up.id,
                partner_id=courier.id, invoice_reference="INV-4",
                order_reference=dup.order_reference, awb_number="AWB-DUP",
                invoice_date=date(2024, 9, 25), zone="A",
                actual_weight_kg=Decimal("0.5"), charged_weight_kg=Decimal("0.5"),
                rate_per_kg=Decimal("30"), freight_amount=Decimal("35"),
                cod_charges=Decimal("0"), total_freight=Decimal("35"),
            ),
            FreightRecord(
                id=uuid.uuid4(), org_id=org.id, upload_id=freight_up.id,
                partner_id=courier.id, invoice_reference="INV-5",
                order_reference=friendly.order_reference, awb_number="AWB-500",
                invoice_date=date(2024, 9, 20), zone="E",
                actual_weight_kg=Decimal("0.5"), charged_weight_kg=Decimal("0.5"),
                rate_per_kg=Decimal("99"), freight_amount=Decimal("500"),
                cod_charges=Decimal("0"), total_freight=Decimal("500"),
            ),
        ]
    )
    run = make_run(db, org, user, "freight", orders_up, freight_up)
    db.flush()
    return {
        "db": db, "run": run, "courier": courier,
        "orders": [over, ok, dup, gone, friendly],
    }


def test_freight_statuses(freight_env):
    db = freight_env["db"]
    run = MatchingService(db).execute(freight_env["run"].id)
    db.flush()

    # ORD-FRT-OVER: rate card → 0.5 × 30 + 20 = 35; billed 100 → overcharge 65
    over = get_result(db, run.id, "ORD-FRT-OVER")
    assert over.stream_status == "freight_overcharged"
    assert over.expected_amount == Decimal("35.00")
    assert over.difference == Decimal("65.00")
    over_claim = get_claim(db, run.id, "ORD-FRT-OVER")
    assert over_claim is not None and over_claim.claim_amount == Decimal("65.00")

    # ORD-FRT-OK: billed 40 = 0.4 × 30 + 20 + 12(COD 2% of... no, prepaid) → 32 vs 40?
    # 0.4×30+20 = 32; billed 40 → gap +8, within tolerance → settled (overpaid merchant-fav)
    ok = get_result(db, run.id, "ORD-FRT-OK")
    assert ok.stream_status == "settled"
    assert ok.expected_amount == Decimal("32.00")

    # ORD-FRT-DUP: AWB billed twice — both legs flagged as duplicate billing;
    # the generic rate-card overcharge flag is suppressed for this order.
    dup = get_result(db, run.id, "ORD-FRT-DUP")
    assert dup.stream_status == "freight_overcharged"
    dup_discs = (
        db.query(Discrepancy)
        .filter(Discrepancy.run_id == run.id)
        .filter(Discrepancy.order_reference == "ORD-FRT-DUP")
        .all()
    )
    assert {d.discrepancy_type.value for d in dup_discs} == {"duplicate_awb_billing"}
    assert len(dup_discs) == 2  # one per billed leg
    dup_claims = (
        db.query(Claim)
        .join(Discrepancy, Claim.discrepancy_id == Discrepancy.id)
        .filter(Discrepancy.order_reference == "ORD-FRT-DUP")
        .all()
    )
    assert len(dup_claims) == 2
    assert all(c.claim_amount == Decimal("35.00") for c in dup_claims)

    # ORD-FRT-GONE: delivered, no invoice → missing_freight_invoice
    gone = get_result(db, run.id, "ORD-FRT-GONE")
    assert gone.stream_status == "missing_freight_invoice"
    assert get_discrepancy(db, run.id, "ORD-FRT-GONE", "missing_freight_invoice") is not None
    # no claim: nothing known to reclaim yet
    assert get_claim(db, run.id, "ORD-FRT-GONE") is None

    # ORD-FRT-NORATE: zone E has no rate card → informational, settled
    friendly = get_result(db, run.id, "ORD-FRT-NORATE")
    assert friendly.stream_status == "settled"
    assert friendly.details["expected_from_rate_card"] == "no_rate_card"


def test_freight_rto_billed_full_price(db):
    org = make_org(db)
    user = make_user(db, org)
    orders_up = make_upload(db, org, user, "orders")
    freight_up = make_upload(db, org, user, "freight_invoices")

    courier = Partner(
        id=uuid.uuid4(),
        org_id=org.id,
        name=f"Courier R{uuid.uuid4().hex[:6]}",
        code=f"CR{uuid.uuid4().hex[:6]}",
        partner_type="courier",
        is_active=True,
    )
    db.add(courier)
    db.flush()
    db.add(
        RateCard(
            id=uuid.uuid4(), org_id=org.id, partner_id=courier.id,
            name="card-A", zone="A",
            weight_slab_min_kg=Decimal("0"), weight_slab_max_kg=Decimal("1"),
            rate_per_kg=Decimal("30"), fixed_charge=Decimal("20"),
            cod_charge_percent=Decimal("0"),
            effective_from=date(2024, 1, 1), effective_to=None,
        )
    )
    rto = make_order(
        db, org, orders_up, "ORD-FRT-RTO",
        status=OrderStatus.RTO, payment_method="prepaid",
    )
    db.add(
        FreightRecord(
            id=uuid.uuid4(), org_id=org.id, upload_id=freight_up.id,
            partner_id=courier.id, invoice_reference="INV-RTO",
            order_reference=rto.order_reference, awb_number="AWB-RTO",
            invoice_date=date(2024, 9, 20), zone="A",
            actual_weight_kg=Decimal("0.5"), charged_weight_kg=Decimal("0.5"),
            rate_per_kg=Decimal("35"), freight_amount=Decimal("35"),
            cod_charges=Decimal("0"), total_freight=Decimal("35"),
        )
    )
    run = make_run(db, org, user, "freight", orders_up, freight_up)
    db.flush()

    MatchingService(db).execute(run.id)
    db.flush()

    result = get_result(db, run.id, "ORD-FRT-RTO")
    # RTO expected = 0.5 × (0.5×30 + 20) = 17.50; billed 35 → overcharged
    assert result.stream_status == "freight_overcharged"
    assert result.expected_amount == Decimal("17.50")
    assert result.difference == Decimal("17.50")


# --------------------------------------------------------------------------- returns


@pytest.fixture()
def returns_env(db):
    org = make_org(db)
    user = make_user(db, org)
    returns_up = make_upload(db, org, user, "returns")
    scans_up = make_upload(db, org, user, "warehouse_scans")

    r_lost = make_order(db, org, orders_up := make_upload(db, org, user, "orders"), "ORD-RET-LOST")
    r_window = make_order(db, org, orders_up, "ORD-RET-WINDOW")
    r_transit = make_order(db, org, orders_up, "ORD-RET-TRANSIT")
    r_late_scan = make_order(db, org, orders_up, "ORD-RET-LATESCAN")
    r_pending_refund = make_order(db, org, orders_up, "ORD-RET-PENDINGREF")
    recent = make_order(db, org, orders_up, "ORD-RET-RECENT")

    db.add_all(
        [
            Return(
                id=uuid.uuid4(), org_id=org.id, upload_id=returns_up.id,
                return_id_reference="RET-1", order_reference=r_lost.order_reference,
                return_date=date(2024, 9, 10), return_status=ReturnStatus.QC_PASSED,
                refund_amount=Decimal("500"), refund_status=RefundStatus.PROCESSED,
            ),
            Return(
                id=uuid.uuid4(), org_id=org.id, upload_id=returns_up.id,
                return_id_reference="RET-2", order_reference=r_window.order_reference,
                return_date=date(2024, 9, 10), return_status=ReturnStatus.RECEIVED,
                refund_amount=Decimal("300"), refund_status=RefundStatus.PROCESSED,
            ),
            Return(
                id=uuid.uuid4(), org_id=org.id, upload_id=returns_up.id,
                return_id_reference="RET-3", order_reference=r_transit.order_reference,
                return_date=date(2024, 9, 15), return_status=ReturnStatus.IN_TRANSIT,
                refund_amount=Decimal("250"), refund_status=RefundStatus.PENDING,
            ),
            Return(
                id=uuid.uuid4(), org_id=org.id, upload_id=returns_up.id,
                return_id_reference="RET-4", order_reference=r_late_scan.order_reference,
                return_date=date(2024, 9, 5), return_status=ReturnStatus.RECEIVED,
                refund_amount=Decimal("150"), refund_status=RefundStatus.PROCESSED,
            ),
            Return(
                id=uuid.uuid4(), org_id=org.id, upload_id=returns_up.id,
                return_id_reference="RET-5", order_reference=r_pending_refund.order_reference,
                return_date=date(2024, 9, 5), return_status=ReturnStatus.QC_FAILED,
                refund_amount=Decimal("150"), refund_status=RefundStatus.PENDING,
            ),
            Return(
                id=uuid.uuid4(), org_id=org.id, upload_id=returns_up.id,
                return_id_reference="RET-6", order_reference=recent.order_reference,
                return_date=date(2026, 11, 5), return_status=ReturnStatus.RECEIVED,
                refund_amount=Decimal("150"), refund_status=RefundStatus.PENDING,
            ),
        ]
    )
    db.add_all(
        [
            WarehouseScan(
                id=uuid.uuid4(), org_id=org.id, upload_id=scans_up.id,
                scan_reference="SCAN-1", order_reference=r_window.order_reference,
                scan_date=date(2024, 9, 14), scan_type="RECEIVED", status="Success",
            ),
            WarehouseScan(
                id=uuid.uuid4(), org_id=org.id, upload_id=scans_up.id,
                scan_reference="SCAN-2", order_reference=r_late_scan.order_reference,
                scan_date=date(2024, 9, 16), scan_type="RECEIVED", status="Success",
            ),
            WarehouseScan(
                id=uuid.uuid4(), org_id=org.id, upload_id=scans_up.id,
                scan_reference="SCAN-3", order_reference=r_lost.order_reference,
                scan_date=date(2024, 9, 1), scan_type="DELIVERED", status="Success",
            ),
        ]
    )
    run = make_run(db, org, user, "return", returns_up, scans_up)
    db.flush()
    return {"db": db, "run": run}

def test_returns_statuses(returns_env):
    db = returns_env["db"]
    run = MatchingService(db).execute(returns_env["run"].id)
    db.flush()

    lost = get_result(db, run.id, "ORD-RET-LOST")
    assert lost.stream_status == "return_not_received"
    disc = get_discrepancy(db, run.id, "ORD-RET-LOST", "return_not_received")
    assert disc is not None and disc.severity.value == "high"
    claim = get_claim(db, run.id, "ORD-RET-LOST")
    assert claim is not None and claim.claim_amount == Decimal("500.00")

    window = get_result(db, run.id, "ORD-RET-WINDOW")
    assert window.stream_status == "settled"  # scan on day +4

    transit = get_result(db, run.id, "ORD-RET-TRANSIT")
    assert transit.stream_status == "not_yet_due"
    assert get_discrepancy(db, run.id, "ORD-RET-TRANSIT", "return_not_received") is None

    # scan 11 days after return_date → outside the 7-day window
    late = get_result(db, run.id, "ORD-RET-LATESCAN")
    assert late.stream_status == "return_not_received"
    assert get_claim(db, run.id, "ORD-RET-LATESCAN") is not None

    pending_refund = get_result(db, run.id, "ORD-RET-PENDINGREF")
    assert pending_refund.stream_status == "return_not_received"
    assert get_discrepancy(db, run.id, "ORD-RET-PENDINGREF", "return_not_received") is not None
    assert get_claim(db, run.id, "ORD-RET-PENDINGREF") is None  # refund not paid

    recent = get_result(db, run.id, "ORD-RET-RECENT")
    assert recent.stream_status == "return_in_transit"
    assert get_discrepancy(db, run.id, "ORD-RET-RECENT", "return_not_received") is None


# --------------------------------------------------------------------------- run bookkeeping


def test_run_counters_and_idempotent_rerun(settlement_env):
    env = settlement_env
    db = env["db"]

    first = MatchingService(db).execute(env["run"].id)
    counts_first = (
        db.query(func.count(Discrepancy.id)).filter(Discrepancy.run_id == first.id).scalar()
    )
    results_first = (
        db.query(func.count(ReconciliationRun.id))
        .filter(ReconciliationRun.id == first.id)
        .scalar()
        == 1
    )

    second = MatchingService(db).execute(first.id)
    counts_second = (
        db.query(func.count(Discrepancy.id)).filter(Discrepancy.run_id == second.id).scalar()
    )

    assert counts_first == 2
    assert counts_second == 2  # purge + rewrite, no duplicates
    assert second.status == ReconStatus.COMPLETED
    assert second.discrepancy_count == 2
    assert second.matched_count == 1
    assert second.unmatched_count == 3
    assert first.id == second.id
    assert results_first


def test_bulk_copy_path_matches_insert_path(settlement_env, monkeypatch):
    """Force the COPY threshold down so large-run writers use PostgreSQL COPY."""
    from app.modules.matching import common as matching_common

    monkeypatch.setattr(matching_common, "COPY_MIN_ROWS", 1)
    db = settlement_env["db"]
    run = MatchingService(db).execute(settlement_env["run"].id)
    db.flush()

    assert run.status == ReconStatus.COMPLETED
    assert run.total_source == 4
    # rows must be fully present with enums/details surviving COPY
    settled = get_result(db, run.id, "ORD-SETTLED")
    assert settled.stream_status == "settled"
    assert settled.expected_amount == Decimal("1052.17")
    short = get_result(db, run.id, "ORD-SHORT")
    assert short.stream_status == "short_paid"
    disc = get_discrepancy(db, run.id, "ORD-SHORT", "short_paid")
    assert disc is not None and disc.expected_amount == Decimal("400.00")
    claim = get_claim(db, run.id, "ORD-SHORT")
    assert claim is not None and claim.claim_amount == Decimal("100.00")
    missing = get_discrepancy(db, run.id, "ORD-MISSING", "unpaid_past_due")
    assert missing is not None
    assert missing.expected_amount == Decimal("999.00")


def test_returns_exception_scan_is_evidence(db):
    """A RECEIVED-type scan with status Exception still proves arrival."""
    org = make_org(db)
    user = make_user(db, org)
    returns_up = make_upload(db, org, user, "returns")
    scans_up = make_upload(db, org, user, "warehouse_scans")
    orders_up = make_upload(db, org, user, "orders")

    r = make_order(db, org, orders_up, "ORD-RET-EXC")
    db.add(
        Return(
            id=uuid.uuid4(), org_id=org.id, upload_id=returns_up.id,
            return_id_reference="RET-EXC", order_reference=r.order_reference,
            return_date=date(2024, 9, 10), return_status=ReturnStatus.QC_PASSED,
            refund_amount=Decimal("120"), refund_status=RefundStatus.PROCESSED,
        )
    )
    db.add(
        WarehouseScan(
            id=uuid.uuid4(), org_id=org.id, upload_id=scans_up.id,
            scan_reference="SCAN-EXC", order_reference=r.order_reference,
            scan_date=date(2024, 9, 12), scan_type="RECEIVED", status="Exception",
        )
    )
    run = make_run(db, org, user, "return", returns_up, scans_up)
    db.flush()

    MatchingService(db).execute(run.id)
    db.flush()

    assert get_result(db, run.id, "ORD-RET-EXC").stream_status == "settled"
    assert get_discrepancy(db, run.id, "ORD-RET-EXC", "return_not_received") is None
