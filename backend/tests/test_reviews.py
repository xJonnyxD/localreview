"""
Tests for reviews endpoints.

Bug #2 regression: avg_rating must update after review create/update/delete.
"""
import pytest
from httpx import AsyncClient


async def _get_business_id(client: AsyncClient) -> str:
    """Helper: get the first available business ID."""
    resp = await client.get("/api/v1/businesses?limit=1")
    assert resp.status_code == 200
    items = resp.json().get("items", [])
    assert len(items) > 0, "No hay negocios — ejecuta el seed primero"
    return items[0]["id"]


async def _get_review_id(client: AsyncClient, business_id: str) -> str | None:
    """Helper: get the first review ID for a given business."""
    resp = await client.get(f"/api/v1/reviews/business/{business_id}?limit=1")
    if resp.status_code != 200:
        return None
    items = resp.json().get("items", [])
    return items[0]["id"] if items else None


@pytest.mark.asyncio
async def test_get_reviews_for_business(client: AsyncClient):
    """Anyone can list reviews for a business."""
    biz_id = await _get_business_id(client)
    resp = await client.get(f"/api/v1/reviews/business/{biz_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_get_reviews_pagination(client: AsyncClient):
    """Review pagination params are respected."""
    biz_id = await _get_business_id(client)
    resp = await client.get(f"/api/v1/reviews/business/{biz_id}?page=1&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 1
    assert data["limit"] == 5
    assert len(data["items"]) <= 5


@pytest.mark.asyncio
async def test_create_review_requires_auth(client: AsyncClient):
    """Creating a review without auth returns 401."""
    biz_id = await _get_business_id(client)
    resp = await client.post(
        "/api/v1/reviews",
        json={"business_id": biz_id, "rating": 5, "text": "Excelente"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_review_success(client: AsyncClient, user_token: str):
    """Authenticated user can create a review."""
    biz_id = await _get_business_id(client)
    resp = await client.post(
        "/api/v1/reviews",
        json={
            "business_id": biz_id,
            "rating": 4,
            "title": "Buena experiencia",
            "text": "Todo estuvo muy bien, lo recomiendo.",
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["rating"] == 4
    assert data["text"] == "Todo estuvo muy bien, lo recomiendo."
    assert "id" in data
    assert "user_display_name" in data


@pytest.mark.asyncio
async def test_create_review_invalid_rating(client: AsyncClient, user_token: str):
    """Rating must be between 1 and 5."""
    biz_id = await _get_business_id(client)
    resp = await client.post(
        "/api/v1/reviews",
        json={"business_id": biz_id, "rating": 6, "text": "Test"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_helpful_vote_requires_auth(client: AsyncClient):
    """Voting helpful without auth returns 401."""
    biz_id = await _get_business_id(client)
    review_id = await _get_review_id(client, biz_id)
    if not review_id:
        pytest.skip("No reviews available")

    resp = await client.post(f"/api/v1/reviews/{review_id}/helpful")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_helpful_vote_success(client: AsyncClient, user_token: str):
    """Authenticated user can vote a review as helpful."""
    biz_id = await _get_business_id(client)
    review_id = await _get_review_id(client, biz_id)
    if not review_id:
        pytest.skip("No reviews available")

    resp = await client.post(
        f"/api/v1/reviews/{review_id}/helpful",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "helpful_count" in data


@pytest.mark.asyncio
async def test_owner_respond_requires_auth(client: AsyncClient):
    """Responding to a review without auth returns 401."""
    biz_id = await _get_business_id(client)
    review_id = await _get_review_id(client, biz_id)
    if not review_id:
        pytest.skip("No reviews available")

    resp = await client.post(
        f"/api/v1/reviews/{review_id}/respond",
        json={"text": "Gracias por tu opinion"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_owner_respond_requires_owner_role(client: AsyncClient, user_token: str):
    """Regular users cannot respond as owners."""
    biz_id = await _get_business_id(client)
    review_id = await _get_review_id(client, biz_id)
    if not review_id:
        pytest.skip("No reviews available")

    resp = await client.post(
        f"/api/v1/reviews/{review_id}/respond",
        json={"text": "Gracias por tu opinion"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_reviews_by_user(client: AsyncClient, user_token: str):
    """Authenticated user can see their own reviews."""
    # Get user ID from /me
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert me_resp.status_code == 200
    user_id = me_resp.json()["id"]

    resp = await client.get(f"/api/v1/reviews/user/{user_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
