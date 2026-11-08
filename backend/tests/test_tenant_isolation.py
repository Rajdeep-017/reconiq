"""Tenant isolation tests — cross-org access must return 403/404.

Two organisations, two users (one per org).  A user from org A must not be
able to read or modify resources that belong to org B via the uploads,
partners, discrepancies or claims endpoints.
"""

import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password, create_access_token
from app.models.discrepancy import (
    Claim,
    ClaimStatus,
    Discrepancy,
    DiscrepancySeverity,
    DiscrepancyStatus,
    DiscrepancyType,
)
from app.models.organization import Organization
from app.models.partner import Partner
from app.models.reconciliation import ReconciliationRun
from app.models.upload import DocumentType, Upload, UploadStatus
from app.models.user import User, UserRole


# ── Fixtures ──────────────────────────────────────────────────────────

@pytest.fixture()
def org_a(db):
    org = Organization(
        id=uuid.uuid4(),
        name="Org A",
        slug="org-a",
        is_active=True,
    )
    db.add(org)
    db.flush()
    return org


@pytest.fixture()
def org_b(db):
    org = Organization(
        id=uuid.uuid4(),
        name="Org B",
        slug="org-b",
        is_active=True,
    )
    db.add(org)
    db.flush()
    return org


@pytest.fixture()
def user_a(db, org_a):
    user = User(
        id=uuid.uuid4(),
        email="user-a@example.com",
        full_name="User A",
        hashed_password=hash_password("password123"),
        role=UserRole.FINANCE_EXECUTIVE,
        is_active=True,
        org_id=org_a.id,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture()
def user_b(db, org_b):
    user = User(
        id=uuid.uuid4(),
        email="user-b@example.com",
        full_name="User B",
        hashed_password=hash_password("password123"),
        role=UserRole.FINANCE_EXECUTIVE,
        is_active=True,
        org_id=org_b.id,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture()
def auth_headers_a(user_a):
    token = create_access_token(
        data={"sub": str(user_a.id), "role": user_a.role.value},
        secret_key="test-secret-key-not-for-production",
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def auth_headers_b(user_b):
    token = create_access_token(
        data={"sub": str(user_b.id), "role": user_b.role.value},
        secret_key="test-secret-key-not-for-production",
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def partner_a(db, org_a):
    p = Partner(
        id=uuid.uuid4(),
        org_id=org_a.id,
        name="Partner A",
        code="partner-a-001",
        partner_type="marketplace",
        is_active=True,
    )
    db.add(p)
    db.flush()
    return p


@pytest.fixture()
def partner_b(db, org_b):
    p = Partner(
        id=uuid.uuid4(),
        org_id=org_b.id,
        name="Partner B",
        code="partner-b-001",
        partner_type="marketplace",
        is_active=True,
    )
    db.add(p)
    db.flush()
    return p


@pytest.fixture()
def upload_a(db, org_a, user_a):
    u = Upload(
        id=uuid.uuid4(),
        org_id=org_a.id,
        uploaded_by_id=user_a.id,
        original_filename="a_orders.csv",
        stored_filename="a_orders_stored.csv",
        file_type="text/csv",
        document_type=DocumentType.ORDERS,
        file_size=1024,
        sha256_checksum="a" * 64,
        status=UploadStatus.COMPLETED,
    )
    db.add(u)
    db.flush()
    return u


@pytest.fixture()
def upload_b(db, org_b, user_b):
    u = Upload(
        id=uuid.uuid4(),
        org_id=org_b.id,
        uploaded_by_id=user_b.id,
        original_filename="b_orders.csv",
        stored_filename="b_orders_stored.csv",
        file_type="text/csv",
        document_type=DocumentType.ORDERS,
        file_size=1024,
        sha256_checksum="b" * 64,
        status=UploadStatus.COMPLETED,
    )
    db.add(u)
    db.flush()
    return u


@pytest.fixture()
def run_a(db, org_a, user_a, upload_a):
    r = ReconciliationRun(
        id=uuid.uuid4(),
        org_id=org_a.id,
        created_by_id=user_a.id,
        name="Run A",
        recon_type="SETTLEMENT",
        source_upload_id=upload_a.id,
        target_upload_id=upload_a.id,
        status="COMPLETED",
        total_source=10,
        total_target=10,
        matched_count=10,
        unmatched_count=0,
        discrepancy_count=0,
        total_expected=Decimal("1000.00"),
        total_received=Decimal("1000.00"),
        total_discrepancy=Decimal("0.00"),
    )
    db.add(r)
    db.flush()
    return r


@pytest.fixture()
def run_b(db, org_b, user_b, upload_b):
    r = ReconciliationRun(
        id=uuid.uuid4(),
        org_id=org_b.id,
        created_by_id=user_b.id,
        name="Run B",
        recon_type="SETTLEMENT",
        source_upload_id=upload_b.id,
        target_upload_id=upload_b.id,
        status="COMPLETED",
        total_source=10,
        total_target=10,
        matched_count=10,
        unmatched_count=0,
        discrepancy_count=0,
        total_expected=Decimal("1000.00"),
        total_received=Decimal("1000.00"),
        total_discrepancy=Decimal("0.00"),
    )
    db.add(r)
    db.flush()
    return r


@pytest.fixture()
def discrepancy_a(db, org_a, run_a, partner_a):
    d = Discrepancy(
        id=uuid.uuid4(),
        org_id=org_a.id,
        run_id=run_a.id,
        partner_id=partner_a.id,
        order_reference="ORD-A-001",
        discrepancy_type=DiscrepancyType.SHORT_PAYMENT,
        severity=DiscrepancySeverity.HIGH,
        status=DiscrepancyStatus.DETECTED,
        expected_amount=Decimal("100.00"),
        actual_amount=Decimal("80.00"),
        difference_amount=Decimal("20.00"),
    )
    db.add(d)
    db.flush()
    return d


@pytest.fixture()
def discrepancy_b(db, org_b, run_b, partner_b):
    d = Discrepancy(
        id=uuid.uuid4(),
        org_id=org_b.id,
        run_id=run_b.id,
        partner_id=partner_b.id,
        order_reference="ORD-B-001",
        discrepancy_type=DiscrepancyType.SHORT_PAYMENT,
        severity=DiscrepancySeverity.HIGH,
        status=DiscrepancyStatus.DETECTED,
        expected_amount=Decimal("100.00"),
        actual_amount=Decimal("80.00"),
        difference_amount=Decimal("20.00"),
    )
    db.add(d)
    db.flush()
    return d


@pytest.fixture()
def claim_a(db, org_a, discrepancy_a, user_a):
    c = Claim(
        id=uuid.uuid4(),
        org_id=org_a.id,
        discrepancy_id=discrepancy_a.id,
        partner_id=discrepancy_a.partner_id,
        created_by_id=user_a.id,
        claim_reference="CLM-A-001",
        claim_type="short_payment",
        claim_amount=Decimal("20.00"),
        recovered_amount=Decimal("0.00"),
        status=ClaimStatus.DRAFT,
    )
    db.add(c)
    db.flush()
    return c


@pytest.fixture()
def claim_b(db, org_b, discrepancy_b, user_b):
    c = Claim(
        id=uuid.uuid4(),
        org_id=org_b.id,
        discrepancy_id=discrepancy_b.id,
        partner_id=discrepancy_b.partner_id,
        created_by_id=user_b.id,
        claim_reference="CLM-B-001",
        claim_type="short_payment",
        claim_amount=Decimal("20.00"),
        recovered_amount=Decimal("0.00"),
        status=ClaimStatus.DRAFT,
    )
    db.add(c)
    db.flush()
    return c


# ── Tests ─────────────────────────────────────────────────────────────


class TestCrossOrgPartners:
    """GET/PATCH /api/v1/partners/{id} — cross-org must be 403."""

    def test_user_a_can_access_own_partner(
        self, client: TestClient, auth_headers_a: dict, partner_a: Partner
    ):
        response = client.get(f"/api/v1/partners/{partner_a.id}", headers=auth_headers_a)
        assert response.status_code == 200

    def test_user_a_cannot_access_org_b_partner(
        self, client: TestClient, auth_headers_a: dict, partner_b: Partner
    ):
        response = client.get(f"/api/v1/partners/{partner_b.id}", headers=auth_headers_a)
        assert response.status_code == 403

    def test_user_b_can_access_own_partner(
        self, client: TestClient, auth_headers_b: dict, partner_b: Partner
    ):
        response = client.get(f"/api/v1/partners/{partner_b.id}", headers=auth_headers_b)
        assert response.status_code == 200

    def test_user_b_cannot_access_org_a_partner(
        self, client: TestClient, auth_headers_b: dict, partner_a: Partner
    ):
        response = client.get(f"/api/v1/partners/{partner_a.id}", headers=auth_headers_b)
        assert response.status_code == 403

    def test_user_a_cannot_patch_org_b_partner(
        self, client: TestClient, auth_headers_a: dict, partner_b: Partner
    ):
        response = client.patch(
            f"/api/v1/partners/{partner_b.id}",
            headers=auth_headers_a,
            json={"name": "Hacked Partner"},
        )
        assert response.status_code == 403


class TestCrossOrgUploads:
    """GET /api/v1/uploads/{id} — cross-org must be 403."""

    def test_user_a_can_access_own_upload(
        self, client: TestClient, auth_headers_a: dict, upload_a: Upload
    ):
        response = client.get(f"/api/v1/uploads/{upload_a.id}", headers=auth_headers_a)
        assert response.status_code == 200

    def test_user_a_cannot_access_org_b_upload(
        self, client: TestClient, auth_headers_a: dict, upload_b: Upload
    ):
        response = client.get(f"/api/v1/uploads/{upload_b.id}", headers=auth_headers_a)
        assert response.status_code == 403


class TestCrossOrgDiscrepancies:
    """GET/PATCH /api/v1/discrepancies/{id} — cross-org must be 403."""

    def test_user_a_can_access_own_discrepancy(
        self, client: TestClient, auth_headers_a: dict, discrepancy_a: Discrepancy
    ):
        response = client.get(
            f"/api/v1/discrepancies/{discrepancy_a.id}", headers=auth_headers_a
        )
        assert response.status_code == 200

    def test_user_a_cannot_access_org_b_discrepancy(
        self, client: TestClient, auth_headers_a: dict, discrepancy_b: Discrepancy
    ):
        response = client.get(
            f"/api/v1/discrepancies/{discrepancy_b.id}", headers=auth_headers_a
        )
        assert response.status_code == 403

    def test_user_a_cannot_patch_org_b_discrepancy(
        self, client: TestClient, auth_headers_a: dict, discrepancy_b: Discrepancy
    ):
        response = client.patch(
            f"/api/v1/discrepancies/{discrepancy_b.id}",
            headers=auth_headers_a,
            json={"status": "resolved"},
        )
        assert response.status_code == 403


class TestCrossOrgClaims:
    """GET /api/v1/claims (list filters by org) and PATCH /api/v1/claims/{id} — cross-org must be 403."""

    def test_user_a_can_access_own_claim_in_list(
        self, client: TestClient, auth_headers_a: dict, claim_a: Claim, claim_b: Claim
    ):
        response = client.get(f"/api/v1/claims", headers=auth_headers_a)
        assert response.status_code == 200
        data = response.json()
        # User A should only see org A claims
        claim_refs = [c["claim_reference"] for c in data]
        assert claim_a.claim_reference in claim_refs
        assert claim_b.claim_reference not in claim_refs

    def test_user_a_cannot_access_org_b_claim_detail(
        self, client: TestClient, auth_headers_a: dict, claim_b: Claim
    ):
        # No GET /claims/{id} detail endpoint exists — listing is org-scoped.
        # Verify org B's claim does not appear in user A's list.
        response = client.get(f"/api/v1/claims", headers=auth_headers_a)
        assert response.status_code == 200
        data = response.json()
        claim_refs = [c["claim_reference"] for c in data]
        assert claim_b.claim_reference not in claim_refs

    def test_user_a_cannot_patch_org_b_claim(
        self, client: TestClient, auth_headers_a: dict, claim_b: Claim
    ):
        response = client.patch(
            f"/api/v1/claims/{claim_b.id}",
            headers=auth_headers_a,
            json={"status": "submitted"},
        )
        assert response.status_code == 403
