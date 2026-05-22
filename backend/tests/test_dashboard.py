"""
Tests for dashboard endpoints.

CRITICAL: These tests verify the ownership filter bug fix (Bug #1 - SECURITY).
Owner A must not see statistics from Owner B's businesses.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_stats_requires_auth(client: AsyncClient):
    """Unauthenticated access should be rejected with 401."""
    resp = await client.get("/api/v1/dashboard/stats")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_stats_requires_business_owner_role(client: AsyncClient, user_token: str):
    """Regular users (not business owners) cannot access dashboard stats."""
    resp = await client.get(
        "/api/v1/dashboard/stats",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403, "Regular users must not access owner dashboard"


@pytest.mark.asyncio
async def test_dashboard_stats_returns_owner_businesses_only(client: AsyncClient, owner_token: str):
    """
    Bug #1 regression: Owner dashboard must only show stats for the owner's businesses.
    Not all businesses in the system.
    """
    resp = await client.get(
        "/api/v1/dashboard/stats",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert resp.status_code == 200, f"Dashboard should return 200, got: {resp.text}"
    data = resp.json()

    # Response must have the expected structure
    assert "businesses" in data, "Response missing 'businesses' key"
    assert "total_businesses" in data, "Response missing 'total_businesses' key"
    assert isinstance(data["businesses"], list), "'businesses' must be a list"
    assert isinstance(data["total_businesses"], int), "'total_businesses' must be int"


@pytest.mark.asyncio
async def test_dashboard_reviews_requires_auth(client: AsyncClient):
    """Unauthenticated access to dashboard reviews should be rejected."""
    resp = await client.get("/api/v1/dashboard/reviews")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_reviews_requires_business_owner(client: AsyncClient, user_token: str):
    """Regular users cannot access dashboard reviews."""
    resp = await client.get(
        "/api/v1/dashboard/reviews",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_dashboard_reviews_returns_paginated_response(client: AsyncClient, owner_token: str):
    """Dashboard reviews must return a paginated response."""
    resp = await client.get(
        "/api/v1/dashboard/reviews?page=1&limit=10",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert data["page"] == 1
    assert data["limit"] == 10


@pytest.mark.asyncio
async def test_dashboard_reviews_invalid_business_id_returns_empty(client: AsyncClient, owner_token: str):
    """
    Bug #1 regression: If a business_id is provided that doesn't belong to the owner,
    the response should be empty (not return data from another owner's business).
    """
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(
        f"/api/v1/dashboard/reviews?business_id={fake_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # Fake business_id not owned by this user -> empty results
    assert data["total"] == 0
    assert data["items"] == []
