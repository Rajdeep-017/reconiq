"""Tests for upload endpoints: /api/v1/uploads/*"""

import io
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.models.organization import Organization
from app.models.partner import Partner
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
        hashed_password="hashed",
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
        hashed_password="hashed",
        role=UserRole.FINANCE_EXECUTIVE,
        is_active=True,
        org_id=org_b.id,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture()
def partner_a(db, org_a):
    p = Partner(
        id=uuid.uuid4(),
        org_id=org_a.id,
        name="Partner A",
        code="partner-a",
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
        code="partner-b",
        partner_type="marketplace",
        is_active=True,
    )
    db.add(p)
    db.flush()
    return p


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


# ── Tests ─────────────────────────────────────────────────────────────

class TestUploadFile:
    """POST /api/v1/uploads"""

    def test_invalid_partner_id_returns_422(
        self, client: TestClient, auth_headers_a: dict[str, str]
    ):
        """Non-UUID partner_id returns 422, never 500."""
        response = client.post(
            "/api/v1/uploads",
            headers=auth_headers_a,
            files={"file": ("orders.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")},
            data={"document_type": "orders", "partner_id": "not-a-uuid"},
        )
        assert response.status_code == 422

    def test_valid_partner_id_returns_201(
        self, client: TestClient, auth_headers_a: dict[str, str], partner_a
    ):
        """Valid UUID partner_id returns 201."""
        response = client.post(
            "/api/v1/uploads",
            headers=auth_headers_a,
            files={"file": ("orders.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")},
            data={"document_type": "orders", "partner_id": str(partner_a.id)},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["original_filename"] == "orders.csv"
        assert data["document_type"] == "orders"
        assert data["status"] == "parsed"

    def test_upload_without_partner_id_returns_201(
        self, client: TestClient, auth_headers_a: dict[str, str]
    ):
        """Optional partner_id — upload succeeds without it."""
        response = client.post(
            "/api/v1/uploads",
            headers=auth_headers_a,
            files={"file": ("orders.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")},
            data={"document_type": "orders"},
        )
        assert response.status_code == 201

    def test_partner_of_another_org_returns_404(
        self, client: TestClient, auth_headers_a: dict[str, str], partner_b
    ):
        """Partner belonging to another org returns 404."""
        response = client.post(
            "/api/v1/uploads",
            headers=auth_headers_a,
            files={"file": ("orders.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")},
            data={"document_type": "orders", "partner_id": str(partner_b.id)},
        )
        assert response.status_code == 404

    def test_wrong_file_type_returns_4xx(
        self, client: TestClient, auth_headers_a: dict[str, str]
    ):
        """Non-CSV/XLSX file returns 422."""
        response = client.post(
            "/api/v1/uploads",
            headers=auth_headers_a,
            files={"file": ("data.txt", io.BytesIO(b"hello world"), "text/plain")},
            data={"document_type": "orders"},
        )
        assert response.status_code == 422

    def test_empty_file_returns_4xx(
        self, client: TestClient, auth_headers_a: dict[str, str]
    ):
        """Empty file returns 422."""
        response = client.post(
            "/api/v1/uploads",
            headers=auth_headers_a,
            files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
            data={"document_type": "orders"},
        )
        assert response.status_code == 422

    def test_oversize_file_returns_4xx(
        self, client: TestClient, auth_headers_a: dict[str, str]
    ):
        """File exceeding MAX_UPLOAD_SIZE_MB returns 422."""
        # MAX_UPLOAD_SIZE_MB = 50, so create a 51 MB file
        big_content = b"x" * (51 * 1024 * 1024)
        response = client.post(
            "/api/v1/uploads",
            headers=auth_headers_a,
            files={"file": ("big.csv", io.BytesIO(big_content), "text/csv")},
            data={"document_type": "orders"},
        )
        assert response.status_code == 422
