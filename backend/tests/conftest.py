"""
Pytest fixtures for LocalReview backend tests.

Requirements: pip install pytest pytest-asyncio httpx
"""
import asyncio
import sys

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Fix for Python 3.14+ on Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())  # type: ignore

from app.db.cassandra import connect_cassandra, close_cassandra
from app.db.mongodb import connect_mongodb, close_mongodb
from app.db.redis import connect_redis, close_redis
from app.main import app  # noqa: E402

# Configure pytest-asyncio mode
pytest_plugins = ("pytest_asyncio",)


@pytest_asyncio.fixture(autouse=True)
async def init_databases():
    """Initialize database connections for each test.

    - MongoDB and Redis are tied to the asyncio event loop, so they must be
      opened and closed per-test (each test has its own event loop).
    - Cassandra uses a ThreadPoolExecutor + its own background event loop,
      so it is NOT tied to the test's event loop.  connect_cassandra() is
      idempotent — the first call creates the cluster/session and runs the
      DDL; subsequent calls return immediately.  We never close it between
      tests to avoid the ~10 s reconnect overhead per test.
    """
    await connect_mongodb()
    await connect_redis()
    await connect_cassandra()   # idempotent — fast after first call
    yield
    await close_mongodb()
    await close_redis()
    # Cassandra intentionally NOT closed here — session is reused across tests


@pytest_asyncio.fixture
async def client():
    """HTTP test client for the FastAPI app."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def user_token(client: AsyncClient) -> str:
    """Access token for a regular user (maria.lopez@email.com)."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "maria.lopez@email.com", "password": "password123"},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def owner_token(client: AsyncClient) -> str:
    """Access token for a business owner (owner@localreview.sv)."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@localreview.sv", "password": "password123"},
    )
    assert resp.status_code == 200, f"Owner login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def admin_token(client: AsyncClient) -> str:
    """Access token for an admin user (admin@localreview.sv)."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@localreview.sv", "password": "password123"},
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def first_business_id(client: AsyncClient) -> str:
    """Return the ID of the first available business."""
    resp = await client.get("/api/v1/businesses?limit=1")
    assert resp.status_code == 200
    items = resp.json().get("items", [])
    assert len(items) > 0, "No businesses in DB — run seed script first"
    return items[0]["id"]
