"""
Tests for comments endpoints.

Bug #5 regression: Comments must be paginated, not return up to 500 items.
"""
import pytest
from httpx import AsyncClient


async def _get_review_id(client: AsyncClient) -> str | None:
    """Helper: get the first available review ID from the first business."""
    biz_resp = await client.get("/api/v1/businesses?limit=1")
    if biz_resp.status_code != 200:
        return None
    items = biz_resp.json().get("items", [])
    if not items:
        return None
    biz_id = items[0]["id"]

    rev_resp = await client.get(f"/api/v1/reviews/business/{biz_id}?limit=1")
    if rev_resp.status_code != 200:
        return None
    reviews = rev_resp.json().get("items", [])
    return reviews[0]["id"] if reviews else None


@pytest.mark.asyncio
async def test_get_comments_returns_paginated_response(client: AsyncClient):
    """
    Bug #5 regression: GET comments must return {items, total, page, limit}
    instead of a plain list with hardcoded 500 limit.
    """
    review_id = await _get_review_id(client)
    if not review_id:
        pytest.skip("No reviews available")

    resp = await client.get(f"/api/v1/reviews/{review_id}/comments?page=1&limit=20")
    assert resp.status_code == 200
    data = resp.json()

    # Must have pagination structure
    assert "items" in data, "Response must have 'items' key (was plain list before fix)"
    assert "total" in data, "Response must have 'total' key"
    assert "page" in data, "Response must have 'page' key"
    assert "limit" in data, "Response must have 'limit' key"
    assert data["page"] == 1
    assert data["limit"] == 20
    assert isinstance(data["items"], list)
    assert isinstance(data["total"], int)


@pytest.mark.asyncio
async def test_get_comments_custom_pagination(client: AsyncClient):
    """Custom page and limit parameters must be respected."""
    review_id = await _get_review_id(client)
    if not review_id:
        pytest.skip("No reviews available")

    resp = await client.get(f"/api/v1/reviews/{review_id}/comments?page=2&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 2
    assert data["limit"] == 5


@pytest.mark.asyncio
async def test_get_comments_limit_cap(client: AsyncClient):
    """Limit must be capped at 100."""
    review_id = await _get_review_id(client)
    if not review_id:
        pytest.skip("No reviews available")

    # Requesting more than 100 should be rejected or capped
    resp = await client.get(f"/api/v1/reviews/{review_id}/comments?limit=500")
    # Should either reject with 422 or cap at 100
    assert resp.status_code in (200, 422)
    if resp.status_code == 200:
        assert resp.json()["limit"] <= 100


@pytest.mark.asyncio
async def test_add_comment_requires_auth(client: AsyncClient):
    """Adding a comment requires authentication."""
    review_id = await _get_review_id(client)
    if not review_id:
        pytest.skip("No reviews available")

    resp = await client.post(
        f"/api/v1/reviews/{review_id}/comments",
        json={"text": "Test comment"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_add_comment_success(client: AsyncClient, user_token: str):
    """Authenticated user can add a comment to a review."""
    review_id = await _get_review_id(client)
    if not review_id:
        pytest.skip("No reviews available")

    resp = await client.post(
        f"/api/v1/reviews/{review_id}/comments",
        json={"text": "Este es un comentario de prueba"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["text"] == "Este es un comentario de prueba"
    assert "id" in data
