"""Tests for authentication endpoints: /api/v1/auth/*"""

import pytest
from fastapi.testclient import TestClient

from app.models.user import User


class TestRegister:
    """POST /api/v1/auth/register"""

    def test_register_success(self, client: TestClient):
        """Successful registration returns 201 with user data."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "full_name": "New User",
                "password": "securepassword123",
                "role": "finance_executive",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["full_name"] == "New User"
        assert data["role"] == "finance_executive"
        assert data["is_active"] is True
        assert "id" in data
        # Password should never be in the response
        assert "password" not in data
        assert "hashed_password" not in data

    def test_register_duplicate_email(self, client: TestClient, test_user: User):
        """Registration with existing email returns 409."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user.email,
                "full_name": "Duplicate User",
                "password": "securepassword123",
                "role": "finance_executive",
            },
        )
        assert response.status_code == 409
        assert "already exists" in response.json()["message"]

    def test_register_invalid_email(self, client: TestClient):
        """Registration with invalid email returns 422."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "full_name": "Bad Email User",
                "password": "securepassword123",
            },
        )
        assert response.status_code == 422

    def test_register_short_password(self, client: TestClient):
        """Registration with password < 8 chars returns 422."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "shortpw@example.com",
                "full_name": "Short PW User",
                "password": "short",
            },
        )
        assert response.status_code == 422

    def test_register_missing_fields(self, client: TestClient):
        """Registration with missing required fields returns 422."""
        response = client.post(
            "/api/v1/auth/register",
            json={"email": "missing@example.com"},
        )
        assert response.status_code == 422

    def test_register_invalid_role(self, client: TestClient):
        """Registration with invalid role returns 422."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "badrole@example.com",
                "full_name": "Bad Role User",
                "password": "securepassword123",
                "role": "superadmin",
            },
        )
        assert response.status_code == 422

    def test_register_cofounder_role(self, client: TestClient):
        """Registration with finance_cofounder role succeeds."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "cofounder@example.com",
                "full_name": "Co-Founder",
                "password": "securepassword123",
                "role": "finance_cofounder",
            },
        )
        assert response.status_code == 201
        assert response.json()["role"] == "finance_cofounder"


class TestLogin:
    """POST /api/v1/auth/login"""

    def test_login_success(self, client: TestClient, test_user: User):
        """Valid credentials return a JWT token."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "testpassword123",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0

    def test_login_wrong_password(self, client: TestClient, test_user: User):
        """Wrong password returns 401."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "wrongpassword123",
            },
        )
        assert response.status_code == 401

    def test_login_nonexistent_email(self, client: TestClient):
        """Non-existent email returns 401."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "nobody@example.com",
                "password": "whatever12345",
            },
        )
        assert response.status_code == 401

    def test_login_inactive_user(self, client: TestClient, db, test_user: User):
        """Deactivated user cannot login."""
        test_user.is_active = False
        db.flush()

        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "testpassword123",
            },
        )
        assert response.status_code == 401


class TestGetMe:
    """GET /api/v1/auth/me"""

    def test_get_me_authenticated(self, client: TestClient, auth_headers: dict):
        """Authenticated user can access their profile."""
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        assert "role" in data

    def test_get_me_no_token(self, client: TestClient):
        """Request without token returns 401."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_get_me_invalid_token(self, client: TestClient):
        """Invalid token returns 401."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401

    def test_get_me_expired_token(self, client: TestClient, test_user: User):
        """Expired token returns 401."""
        from datetime import timedelta

        from app.core.security import create_access_token

        token = create_access_token(
            data={"sub": str(test_user.id)},
            secret_key="test-secret-key-not-for-production",
            expires_delta=timedelta(seconds=-1),  # Already expired
        )
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401

