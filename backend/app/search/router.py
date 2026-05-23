"""
Búsqueda de negocios — Cassandra + filtrado en Python.
Para conjuntos pequeños (negocios locales de El Salvador) es eficiente.
La distancia se calcula con Haversine en Python.
"""
from __future__ import annotations

import math

from fastapi import APIRouter, Query

from app.businesses.schemas import BusinessResponse
from app.businesses.service import _get_categories_by_ids
from app.db.cassandra import cass_exec
from app.models import Business

router = APIRouter(prefix="/api/v1/search", tags=["search"])


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


@router.get("", response_model=dict)
async def search_businesses(
    q: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius: float = Query(50, description="Radio en km"),
    category_id: int | None = None,
    min_rating: float | None = None,
    price_level: str | None = Query(None, description="Niveles separados por coma: 1,2,3"),
    sort: str = Query("rating", description="rating | distance | newest"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    # Cargar todos los negocios activos
    rows = list(await cass_exec("SELECT * FROM businesses", ()))
    rows = [r for r in rows if r.get("is_active")]

    # ── Filtros ──────────────────────────────────────────────────────────────
    if q:
        q_lower = q.lower()
        rows = [r for r in rows if q_lower in (r.get("name") or "").lower()
                or q_lower in (r.get("description") or "").lower()
                or q_lower in (r.get("city") or "").lower()]

    if category_id is not None:
        rows = [r for r in rows if category_id in (r.get("category_ids") or [])]

    if min_rating is not None:
        rows = [r for r in rows if float(r.get("avg_rating") or 0) >= min_rating]

    if price_level:
        levels = {int(x) for x in price_level.split(",") if x.strip().isdigit()}
        rows = [r for r in rows if r.get("price_level") in levels]

    if lat is not None and lng is not None:
        filtered = []
        for r in rows:
            blat, blng = r.get("latitude"), r.get("longitude")
            if blat is not None and blng is not None:
                if _haversine_km(lat, lng, blat, blng) <= radius:
                    filtered.append(r)
            else:
                filtered.append(r)  # sin coordenadas → incluir
        rows = filtered

    total = len(rows)

    # ── Ordenamiento ─────────────────────────────────────────────────────────
    if sort == "distance" and lat is not None and lng is not None:
        def dist_key(r):
            blat, blng = r.get("latitude"), r.get("longitude")
            if blat is not None and blng is not None:
                return _haversine_km(lat, lng, blat, blng)
            return 99999.0
        rows.sort(key=dist_key)
    elif sort == "newest":
        rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    else:
        rows.sort(key=lambda r: float(r.get("avg_rating") or 0), reverse=True)

    page_rows = rows[(page - 1) * limit: page * limit]

    # ── Construir respuesta ───────────────────────────────────────────────────
    items = []
    for row in page_rows:
        cat_ids = list(row.get("category_ids") or [])
        cats = await _get_categories_by_ids(cat_ids)
        biz = Business.from_row(row, categories=cats)
        items.append(BusinessResponse(**biz.to_response_dict()).model_dump(mode="json"))

    return {"items": items, "total": total, "page": page, "limit": limit}
