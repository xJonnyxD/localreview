"""
Tests for businesses endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_businesses_public(client: AsyncClient):
    """Anyone can list businesses without auth."""
    resp = await client.get("/api/v1/businesses")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_businesses_pagination(client: AsyncClient):
    """Pagination params (page, limit) are respected."""
    resp = await client.get("/api/v1/businesses?page=1&limit=3")
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 1
    assert data["limit"] == 3
    assert len(data["items"]) <= 3


@pytest.mark.asyncio
async def test_get_business_by_id(client: AsyncClient, first_business_id: str):
    """Can retrieve a single business by ID."""
    resp = await client.get(f"/api/v1/businesses/{first_business_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == first_business_id
    assert "name" in data
    assert "avg_rating" in data
    assert "categories" in data


@pytest.mark.asyncio
async def test_get_business_not_found(client: AsyncClient):
    """Unknown business ID returns 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"/api/v1/businesses/{fake_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_categories(client: AsyncClient):
    """Categories endpoint returns a list."""
    resp = await client.get("/api/v1/businesses/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "name" in data[0]


@pytest.mark.asyncio
async def test_create_business_requires_auth(client: AsyncClient):
    """Creating a business without auth returns 401."""
    resp = await client.post(
        "/api/v1/businesses",
        json={"name": "Test", "address": "Test", "city": "San Salvador"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_business_requires_owner_role(client: AsyncClient, user_token: str):
    """Regular users cannot create businesses."""
    resp = await client.post(
        "/api/v1/businesses",
        json={"name": "Test", "address": "Test", "city": "San Salvador"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_business_success(client: AsyncClient, owner_token: str):
    """Business owner can create a business."""
    resp = await client.post(
        "/api/v1/businesses",
        json={
            "name": "Negocio de Prueba pytest",
            "description": "Test de creacion",
            "address": "Calle Prueba 123",
            "city": "San Salvador",
            "country": "SV",
            "category_ids": [],
            "hours": [],
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Negocio de Prueba pytest"
    assert data["city"] == "San Salvador"
    assert data["country"] == "SV"
    assert "id" in data
    assert "slug" in data


@pytest.mark.asyncio
async def test_update_business_requires_auth(client: AsyncClient, first_business_id: str):
    """Updating a business without auth returns 401."""
    resp = await client.patch(
        f"/api/v1/businesses/{first_business_id}",
        json={"name": "Nuevo nombre"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_search_businesses(client: AsyncClient):
    """Search endpoint returns paginated results."""
    resp = await client.get("/api/v1/search?q=restaurante")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_search_by_city(client: AsyncClient):
    """Search with city filter works."""
    resp = await client.get("/api/v1/search?city=San Salvador")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
