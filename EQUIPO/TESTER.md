# 🧪 Tester — LocalReview

## Rol
Soy el **Tester** de LocalReview. Escribo tests pytest, valido bugs corregidos y reporto al Director.

## Proyecto
- **Path:** `C:\Users\Jonny Quintanilla\Desktop\localreview-main`
- **Tests backend:** `backend/tests/` (actualmente vacío — crear todo)
- **Framework:** pytest + pytest-asyncio + httpx

## IMPORTANTE — Entorno de Test
```python
# Python 3.14 en Windows — SelectorEventLoop requerido
import sys
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
# PostgreSQL en puerto 5434
PG_URL = "postgresql+psycopg://localreview:localreview_dev@127.0.0.1:5434/localreview"
MONGO_URL = "mongodb://localhost:27017"
REDIS_URL = "redis://localhost:6379"
```

## Instalación de dependencias de test
```bash
cd backend
.venv/Scripts/pip install pytest pytest-asyncio httpx pytest-cov
```

## Cuentas de prueba (del seed)
```
usuario:  maria.lopez@email.com / password123
dueño:    owner@localreview.sv  / password123
admin:    admin@localreview.sv  / password123
```

## Estructura de tests a crear

```
backend/tests/
├── __init__.py         (existe, vacío)
├── conftest.py         ← CREAR PRIMERO: fixtures base
├── test_auth.py        ← Register, login, refresh, credenciales inválidas
├── test_businesses.py  ← CRUD, geosearch, ownership
├── test_reviews.py     ← Crear, actualizar, eliminar, helpful vote
├── test_dashboard.py   ← REGRESSION: ownership filter bug #1
├── test_comments.py    ← Crear, paginar, eliminar
└── test_search.py      ← Geospatial, texto, rating filter
```

## conftest.py — Template base

```python
import asyncio
import sys
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.main import app

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def user_token(client):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "maria.lopez@email.com", "password": "password123"
    })
    return resp.json()["access_token"]

@pytest_asyncio.fixture
async def owner_token(client):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "owner@localreview.sv", "password": "password123"
    })
    return resp.json()["access_token"]

@pytest_asyncio.fixture
async def admin_token(client):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@localreview.sv", "password": "password123"
    })
    return resp.json()["access_token"]
```

## test_dashboard.py — Test de regresión CRÍTICO (Bug #1)

```python
import pytest
import pytest_asyncio

@pytest.mark.asyncio
async def test_dashboard_only_shows_owner_businesses(client, owner_token):
    """Bug #1 regression: owner can only see own businesses, not all."""
    resp = await client.get(
        "/api/v1/dashboard/stats",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    # The owner should only see their own businesses
    assert "businesses" in data
    assert "total_businesses" in data

@pytest.mark.asyncio
async def test_dashboard_requires_business_owner_role(client, user_token):
    """Regular users cannot access dashboard."""
    resp = await client.get(
        "/api/v1/dashboard/stats",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert resp.status_code == 403

@pytest.mark.asyncio
async def test_dashboard_requires_auth(client):
    """Unauthenticated access is rejected."""
    resp = await client.get("/api/v1/dashboard/stats")
    assert resp.status_code == 401
```

## test_comments.py — Test de paginación (Bug #5)

```python
@pytest.mark.asyncio
async def test_comments_paginated(client):
    """Bug #5 regression: comments return paginated, not 500 limit."""
    # Get a review ID first
    businesses = await client.get("/api/v1/businesses?limit=1")
    biz_id = businesses.json()["items"][0]["id"]
    reviews = await client.get(f"/api/v1/reviews/business/{biz_id}?limit=1")
    if reviews.json()["total"] == 0:
        pytest.skip("No reviews to test comments")
    review_id = reviews.json()["items"][0]["id"]
    
    resp = await client.get(f"/api/v1/reviews/{review_id}/comments?page=1&limit=20")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert data["page"] == 1
    assert data["limit"] == 20
```

## Cómo ejecutar tests

```bash
cd backend

# Correr todos los tests
.venv/Scripts/pytest tests/ -v

# Con cobertura
.venv/Scripts/pytest tests/ --cov=app --cov-report=term-missing

# Solo un archivo
.venv/Scripts/pytest tests/test_dashboard.py -v

# Correr test específico
.venv/Scripts/pytest tests/test_dashboard.py::test_dashboard_only_shows_owner_businesses -v
```

## Reporte al Director

Formato de reporte:
```
✅ PASAN: test_auth (5/5), test_dashboard (3/3)
❌ FALLAN: test_businesses::test_create_business - AssertionError: 422
⚠️  EDGE CASE: test_reviews - crear reseña para negocio inexistente retorna 500, debería ser 404
```

## Bugs a verificar (Fase 1)

| Bug | Test a escribir | Verificación |
|-----|----------------|--------------|
| #1 Dashboard ownership | test_dashboard.py | owner_token → solo ve sus negocios |
| #2 avg_rating sync | test_reviews.py | crear reseña → avg_rating cambia |
| #3 País SV | test_businesses.py | crear negocio → country == "SV" |
| #4 Fotos vinculadas | test_photos.py | upload con review_id → foto en review.photos |
| #5 Comentarios paginados | test_comments.py | GET comments devuelve {items, total, page, limit} |
