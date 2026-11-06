"""Tests for user management endpoints: /api/v1/users/*"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.models.user import User


class TestListUsers:
    """GET /api/v1/users"""

    def test_list_users_as_admin(
        self, client: TestClient, admin_headers: dict, admin_user: User
    ):
        """Finance co-founder can list users."""
        response = client.get("/api/v1/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert isinstance(data["users"], list)

    def test_list_users_as_executive(
        self, client: TestClient, auth_headers: dict
    ):
        """Finance executive cannot list users (no MANAGE_USERS permission)."""
        response = client.get("/api/v1/users", headers=auth_headers)
        assert response.status_code == 403

    def test_list_users_unauthenticated(self, client: TestClient):
        """Unauthenticated request returns 401."""
        response = client.get("/api/v1/users")
        assert response.status_code == 401

    def test_list_users_pagination(
        self, client: TestClient, admin_headers: dict
    ):
        """Pagination parameters work correctly."""
        response = client.get(
            "/api/v1/users?page=1&page_size=10",
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10


class TestGetUser:
    """GET /api/v1/users/{user_id}"""

    def test_get_user_as_admin(
        self,
        client: TestClient,
        admin_headers: dict,
        test_user: User,
    ):
        """Admin can get any user by ID."""
        response = client.get(
            f"/api/v1/users/{test_user.id}",
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["id"] == str(test_user.id)

    def test_get_user_not_found(
        self, client: TestClient, admin_headers: dict
    ):
        """Non-existent user ID returns 404."""
        fake_id = uuid.uuid4()
        response = client.get(
            f"/api/v1/users/{fake_id}",
            headers=admin_headers,
        )
        assert response.status_code == 404


class TestUpdateProfile:
    """PATCH /api/v1/users/me"""

    def test_update_own_name(self, client: TestClient, auth_headers: dict):
        """User can update their own name."""
        response = client.patch(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"full_name": "Updated Name"},
        )
        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Name"

    def test_update_own_email(self, client: TestClient, auth_headers: dict):
        """User can update their own email."""
        new_email = f"updated_{uuid.uuid4().hex[:6]}@example.com"
        response = client.patch(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"email": new_email},
        )
        assert response.status_code == 200
        assert response.json()["email"] == new_email


class TestUpdateRole:
    """PATCH /api/v1/users/{user_id}/role"""

    def test_admin_changes_role(
        self,
        client: TestClient,
        admin_headers: dict,
        test_user: User,
    ):
        """Admin can change another user's role."""
        response = client.patch(
            f"/api/v1/users/{test_user.id}/role",
            headers=admin_headers,
            json={"role": "finance_cofounder"},
        )
        assert response.status_code == 200
        assert response.json()["role"] == "finance_cofounder"

    def test_executive_cannot_change_role(
        self,
        client: TestClient,
        auth_headers: dict,
        admin_user: User,
    ):
        """Executive cannot change roles."""
        response = client.patch(
            f"/api/v1/users/{admin_user.id}/role",
            headers=auth_headers,
            json={"role": "finance_executive"},
        )
        # Should fail — either 403 from the service or 403 from dependency
        assert response.status_code == 403

    def test_admin_cannot_change_own_role(
        self,
        client: TestClient,
        admin_headers: dict,
        admin_user: User,
    ):
        """Admin cannot change their own role."""
        response = client.patch(
            f"/api/v1/users/{admin_user.id}/role",
            headers=admin_headers,
            json={"role": "finance_executive"},
        )
        assert response.status_code == 403


class TestDeactivateUser:
    """DELETE /api/v1/users/{user_id}"""

    def test_admin_deactivates_user(
        self,
        client: TestClient,
        admin_headers: dict,
        test_user: User,
    ):
        """Admin can deactivate another user."""
        response = client.delete(
            f"/api/v1/users/{test_user.id}",
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_executive_cannot_deactivate(
        self,
        client: TestClient,
        auth_headers: dict,
        admin_user: User,
    ):
        """Executive cannot deactivate users."""
        response = client.delete(
            f"/api/v1/users/{admin_user.id}",
            headers=auth_headers,
        )
        assert response.status_code == 403

    def test_admin_cannot_deactivate_self(
        self,
        client: TestClient,
        admin_headers: dict,
        admin_user: User,
    ):
        """Admin cannot deactivate themselves."""
        response = client.delete(
            f"/api/v1/users/{admin_user.id}",
            headers=admin_headers,
        )
        assert response.status_code == 403

