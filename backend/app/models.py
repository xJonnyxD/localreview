"""
Modelos de dominio puros (dataclasses) — sin SQLAlchemy.
Cassandra es la única base de datos.
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Users ─────────────────────────────────────────────────────────────────────

@dataclass
class User:
    id: uuid.UUID
    email: str
    password_hash: str
    display_name: str
    role: str = "user"
    is_active: bool = True
    bio: str | None = None
    avatar_url: str | None = None
    preferences: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)

    @classmethod
    def from_row(cls, row: dict) -> "User":
        prefs = row.get("preferences") or "{}"
        if isinstance(prefs, str):
            try:
                prefs = json.loads(prefs)
            except Exception:
                prefs = {}
        return cls(
            id=row["id"],
            email=row["email"],
            password_hash=row.get("password_hash", ""),
            display_name=row.get("display_name", ""),
            role=row.get("role", "user"),
            is_active=bool(row.get("is_active", True)),
            bio=row.get("bio"),
            avatar_url=row.get("avatar_url"),
            preferences=prefs,
            created_at=row.get("created_at") or _now(),
            updated_at=row.get("updated_at") or _now(),
        )


# ── Categories ────────────────────────────────────────────────────────────────

@dataclass
class Category:
    id: int
    name: str
    slug: str
    icon: str | None = None
    parent_id: int | None = None

    @classmethod
    def from_row(cls, row: dict) -> "Category":
        return cls(
            id=row["id"],
            name=row["name"],
            slug=row["slug"],
            icon=row.get("icon"),
            parent_id=row.get("parent_id"),
        )


# ── Business Hours ────────────────────────────────────────────────────────────

@dataclass
class BusinessHours:
    day_of_week: int
    open_time: str
    close_time: str
    is_closed: bool = False
    id: int = 0  # kept for frontend compatibility


# ── Businesses ────────────────────────────────────────────────────────────────

@dataclass
class Business:
    id: uuid.UUID
    name: str
    slug: str
    address: str
    city: str
    country: str = "SV"
    owner_id: uuid.UUID | None = None
    description: str | None = None
    state: str | None = None
    postal_code: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    price_level: int | None = None
    is_verified: bool = False
    is_active: bool = True
    avg_rating: float = 0.0
    review_count: int = 0
    photo_url: str | None = None
    categories: list[Category] = field(default_factory=list)
    hours: list[BusinessHours] = field(default_factory=list)
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)

    @classmethod
    def from_row(cls, row: dict, categories: list[Category] | None = None) -> "Business":
        # Parse hours from JSON
        hours: list[BusinessHours] = []
        hours_json = row.get("hours_json")
        if hours_json:
            try:
                for i, h in enumerate(json.loads(hours_json)):
                    hours.append(BusinessHours(
                        id=i,
                        day_of_week=h["day_of_week"],
                        open_time=h.get("open_time", "08:00"),
                        close_time=h.get("close_time", "18:00"),
                        is_closed=h.get("is_closed", False),
                    ))
            except Exception:
                pass

        # Build categories from parallel lists
        cats: list[Category] = []
        if categories is not None:
            cats = categories
        else:
            cat_ids = list(row.get("category_ids") or [])
            cat_names = list(row.get("category_names") or [])
            for i, cid in enumerate(cat_ids):
                name = cat_names[i] if i < len(cat_names) else str(cid)
                cats.append(Category(id=cid, name=name, slug=name.lower()))

        return cls(
            id=row["id"],
            name=row["name"],
            slug=row.get("slug", ""),
            address=row.get("address", ""),
            city=row.get("city", ""),
            country=row.get("country", "SV"),
            owner_id=row.get("owner_id"),
            description=row.get("description"),
            state=row.get("state"),
            postal_code=row.get("postal_code"),
            phone=row.get("phone"),
            email=row.get("email"),
            website=row.get("website"),
            latitude=row.get("latitude"),
            longitude=row.get("longitude"),
            price_level=row.get("price_level"),
            is_verified=bool(row.get("is_verified", False)),
            is_active=bool(row.get("is_active", True)),
            avg_rating=float(row.get("avg_rating") or 0),
            review_count=int(row.get("review_count") or 0),
            photo_url=row.get("photo_url"),
            categories=cats,
            hours=hours,
            created_at=row.get("created_at") or _now(),
            updated_at=row.get("updated_at") or _now(),
        )

    def to_response_dict(self) -> dict:
        return {
            "id": str(self.id),
            "owner_id": str(self.owner_id) if self.owner_id else None,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "postal_code": self.postal_code,
            "country": self.country,
            "phone": self.phone,
            "email": self.email,
            "website": self.website,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "price_level": self.price_level,
            "is_verified": self.is_verified,
            "is_active": self.is_active,
            "avg_rating": self.avg_rating,
            "review_count": self.review_count,
            "photo_url": self.photo_url,
            "categories": [
                {"id": c.id, "name": c.name, "slug": c.slug, "icon": c.icon, "parent_id": c.parent_id}
                for c in self.categories
            ],
            "hours": [
                {
                    "id": h.id,
                    "day_of_week": h.day_of_week,
                    "open_time": h.open_time,
                    "close_time": h.close_time,
                    "is_closed": h.is_closed,
                }
                for h in self.hours
            ],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
