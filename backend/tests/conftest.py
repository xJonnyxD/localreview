"""
Pytest fixtures para los tests del backend de LocalReview.

Requisitos: pip install pytest pytest-asyncio httpx
"""
import asyncio
import sys

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Fix para Python 3.12+ en Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())  # type: ignore

from app.db.cassandra import connect_cassandra, close_cassandra
from app.main import app  # noqa: E402

pytest_plugins = ("pytest_asyncio",)


@pytest_asyncio.fixture(autouse=True)
async def init_databases():
    """Inicializa Cassandra para cada test.

    connect_cassandra() es idempotente — la primera llamada crea el cluster
    y ejecuta el DDL; las siguientes retornan inmediatamente.
    No cerramos la sesión entre tests para evitar el overhead de reconexión.
    """
    await connect_cassandra()
    yield
    # La sesión de Cassandra se reutiliza entre tests intencionalmente


@pytest_asyncio.fixture
async def client():
    """Cliente HTTP para la app FastAPI."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def user_token(client: AsyncClient) -> str:
    """Token de acceso para usuario regular (maria.lopez@email.com)."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "maria.lopez@email.com", "password": "password123"},
    )
    assert resp.status_code == 200, f"Login fallido: {resp.text}"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def owner_token(client: AsyncClient) -> str:
    """Token de acceso para propietario (owner@localreview.sv)."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@localreview.sv", "password": "password123"},
    )
    assert resp.status_code == 200, f"Login fallido: {resp.text}"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def admin_token(client: AsyncClient) -> str:
    """Token de acceso para admin (admin@localreview.sv)."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@localreview.sv", "password": "password123"},
    )
    assert resp.status_code == 200, f"Login fallido: {resp.text}"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def first_business_id(client: AsyncClient) -> str:
    """Retorna el ID del primer negocio disponible."""
    resp = await client.get("/api/v1/businesses?limit=1")
    assert resp.status_code == 200
    items = resp.json().get("items", [])
    assert len(items) > 0, "No hay negocios en BD — ejecuta el seed primero"
    return items[0]["id"]
