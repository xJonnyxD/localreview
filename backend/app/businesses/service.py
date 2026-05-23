from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone

from app.businesses.schemas import BusinessCreate, BusinessUpdate
from app.db.cassandra import cass_exec
from app.models import Business, Category


def _now() -> datetime:
    return datetime.now(timezone.utc)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text)


async def _get_categories_by_ids(cat_ids: list[int]) -> list[Category]:
    if not cat_ids:
        return []
    rows = list(await cass_exec("SELECT * FROM categories", ()))
    cat_map = {r["id"]: r for r in rows}
    return [
        Category(id=cid, name=cat_map[cid]["name"], slug=cat_map[cid]["slug"],
                 icon=cat_map[cid].get("icon"), parent_id=cat_map[cid].get("parent_id"))
        for cid in cat_ids if cid in cat_map
    ]


async def get_business_by_id(business_id: uuid.UUID) -> Business | None:
    rows = list(await cass_exec("SELECT * FROM businesses WHERE id = %s", (business_id,)))
    if not rows:
        return None
    row = rows[0]
    cat_ids = list(row.get("category_ids") or [])
    cats = await _get_categories_by_ids(cat_ids)
    return Business.from_row(row, categories=cats)


async def get_business_by_slug(slug: str) -> Business | None:
    rows = list(await cass_exec("SELECT id FROM businesses_by_slug WHERE slug = %s", (slug,)))
    if not rows:
        return None
    return await get_business_by_id(rows[0]["id"])


async def create_business(data: BusinessCreate, owner_id: uuid.UUID | None = None) -> Business:
    biz_id = uuid.uuid4()
    slug = slugify(data.name)

    # Unicidad del slug
    existing = list(await cass_exec("SELECT id FROM businesses_by_slug WHERE slug = %s", (slug,)))
    if existing:
        slug = f"{slug}-{biz_id.hex[:6]}"

    now = _now()
    cats = await _get_categories_by_ids(data.category_ids or [])
    cat_names = [c.name for c in cats]

    hours_list = [
        {"day_of_week": h.day_of_week, "open_time": h.open_time,
         "close_time": h.close_time, "is_closed": h.is_closed}
        for h in (data.hours or [])
    ]
    hours_json = json.dumps(hours_list)

    await cass_exec(
        """
        INSERT INTO businesses (
            id, owner_id, name, slug, description, address, city, state,
            postal_code, country, phone, email, website,
            latitude, longitude, price_level,
            is_verified, is_active, avg_rating, review_count, photo_url,
            category_ids, category_names, hours_json, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """,
        (
            biz_id, owner_id, data.name, slug, data.description,
            data.address, data.city, data.state, data.postal_code, data.country,
            data.phone, data.email, data.website,
            data.latitude, data.longitude, data.price_level,
            False, True, 0.0, 0, data.photo_url,
            list(data.category_ids or []), cat_names, hours_json, now, now,
        ),
    )
    await cass_exec("INSERT INTO businesses_by_slug (slug, id) VALUES (%s, %s)", (slug, biz_id))
    if owner_id:
        await cass_exec(
            "INSERT INTO businesses_by_owner (owner_id, business_id) VALUES (%s, %s)",
            (owner_id, biz_id),
        )

    return Business(
        id=biz_id, owner_id=owner_id, name=data.name, slug=slug,
        description=data.description, address=data.address, city=data.city,
        state=data.state, postal_code=data.postal_code, country=data.country,
        phone=data.phone, email=data.email, website=data.website,
        latitude=data.latitude, longitude=data.longitude, price_level=data.price_level,
        is_verified=False, is_active=True, avg_rating=0.0, review_count=0,
        categories=cats,
        hours=[],
        created_at=now, updated_at=now,
    )


async def update_business(business: Business, data: BusinessUpdate) -> Business:
    now = _now()
    updates: dict = {}

    simple_fields = ["name", "description", "address", "city", "state", "postal_code",
                     "country", "phone", "email", "website", "price_level", "photo_url"]
    for f in simple_fields:
        val = getattr(data, f, None)
        if val is not None:
            updates[f] = val

    if data.latitude is not None:
        updates["latitude"] = data.latitude
    if data.longitude is not None:
        updates["longitude"] = data.longitude

    if data.category_ids is not None:
        cats = await _get_categories_by_ids(data.category_ids)
        updates["category_ids"] = list(data.category_ids)
        updates["category_names"] = [c.name for c in cats]
        business.categories = cats

    if data.hours is not None:
        hours_list = [
            {"day_of_week": h.day_of_week, "open_time": h.open_time,
             "close_time": h.close_time, "is_closed": h.is_closed}
            for h in data.hours
        ]
        updates["hours_json"] = json.dumps(hours_list)

    if updates:
        updates["updated_at"] = now
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [business.id]
        await cass_exec(f"UPDATE businesses SET {set_clause} WHERE id = %s", values)

        for k, v in updates.items():
            if hasattr(business, k):
                setattr(business, k, v)

    return await get_business_by_id(business.id) or business


async def list_businesses(
    page: int = 1,
    limit: int = 20,
    city: str | None = None,
    category_id: int | None = None,
) -> tuple[list[Business], int]:
    rows = list(await cass_exec("SELECT * FROM businesses", ()))
    rows = [r for r in rows if r.get("is_active")]

    if city:
        city_lower = city.lower()
        rows = [r for r in rows if city_lower in (r.get("city") or "").lower()]
    if category_id is not None:
        rows = [r for r in rows if category_id in (r.get("category_ids") or [])]

    rows.sort(key=lambda r: float(r.get("avg_rating") or 0), reverse=True)
    total = len(rows)
    page_rows = rows[(page - 1) * limit: page * limit]

    businesses = []
    for row in page_rows:
        cat_ids = list(row.get("category_ids") or [])
        cats = await _get_categories_by_ids(cat_ids)
        businesses.append(Business.from_row(row, categories=cats))
    return businesses, total


async def list_categories() -> list[Category]:
    rows = list(await cass_exec("SELECT * FROM categories", ()))
    cats = [Category.from_row(r) for r in rows]
    return sorted(cats, key=lambda c: c.name)
