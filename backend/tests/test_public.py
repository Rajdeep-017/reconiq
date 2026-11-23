"""Public landing-page API tests — no auth, no tenant data."""
from __future__ import annotations

import pytest


def test_public_overview_is_unauthenticated_and_internally_consistent(client):
    response = client.get("/api/v1/public/overview")

    assert response.status_code == 200
    data = response.json()

    assert data["mode"] == "demo"
    assert "not live customer data" in data["disclaimer"].lower()

    overview = data["overview"]
    assert overview["total_transactions"] == (
        overview["matched_transactions"] + overview["pending_transactions"]
    )
    assert sum(point["matched"] for point in data["trend"]) == overview["matched_transactions"]
    assert sum(point["pending"] for point in data["trend"]) == overview["pending_transactions"]

    assert sum(point["count"] for point in data["matching_breakdown"]) == overview["total_transactions"]

    settlement = data["settlement"]
    assert settlement["difference"] == pytest.approx(
        settlement["actual_amount"] - settlement["expected_amount"]
    )

    discrepancies = data["discrepancies"]
    assert discrepancies["open"] == sum(category["count"] for category in discrepancies["categories"])

    claims = data["claims"]
    assert claims["total"] == (
        claims["draft"]
        + claims["submitted"]
        + claims["under_review"]
        + claims["resolved"]
    )


def test_public_overview_does_not_leak_tenant_or_auth_fields(client):
    response = client.get("/api/v1/public/overview")
    body = response.text.lower()

    for forbidden in ("org_id", "organization_id", "access_token", "authorization", "email"):
        assert forbidden not in body
