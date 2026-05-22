"""
Tests for authentication endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Valid credentials should return access and refresh tokens."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "maria.lopez@email.com", "password": "password123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Wrong password should return 401."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "maria.lopez@email.com", "password": "wrongpassword"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_email(client: AsyncClient):
    """Non-existent email should return 401."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "noexiste@email.com", "password": "password123"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, user_token: str):
    """Authenticated user can get their profile."""
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "email" in data
    assert data["email"] == "maria.lopez@email.com"


@pytest.mark.asyncio
async def test_get_current_user_no_token(client: AsyncClient):
    """Unauthenticated request should return 401."""
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_owner_role(client: AsyncClient, owner_token: str):
    """Business owner should have role 'business_owner'."""
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "business_owner"


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Health endpoint should return 200."""
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
