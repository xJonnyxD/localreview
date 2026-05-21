import hashlib
import json

from fastapi import APIRouter, Depends, Query, Request
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_MakePoint
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.businesses.models import Business, BusinessCategory
from app.businesses.schemas import BusinessResponse
from app.businesses.router import business_to_response
from app.db.postgres import get_db
from app.db.redis import get_redis

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("", response_model=dict)
async def search_businesses(
    request: Request,
    q: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius: float = Query(5, description="Radius in km"),
    category_id: int | None = None,
    min_rating: float | None = None,
    price_level: str | None = Query(None, description="Comma-separated: 1,2,3"),
    sort: str = Query("rating", description="rating|distance|newest"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    # Check cache
    redis = get_redis()
    cache_key = None
    if redis:
        query_hash = hashlib.md5(str(request.query_params).encode()).hexdigest()
        cache_key = f"search:results:{query_hash}"
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)

    query = (
        select(Business)
        .options(selectinload(Business.categories), selectinload(Business.hours))
        .where(Business.is_active == True)
    )

    if q:
        query = query.where(Business.name.ilike(f"%{q}%"))

    if lat is not None and lng is not None:
        point = ST_MakePoint(lng, lat)
        radius_meters = radius * 1000
        query = query.where(ST_DWithin(Business.location, point, radius_meters))

    if category_id:
        query = query.join(BusinessCategory).where(BusinessCategory.category_id == category_id)

    if min_rating is not None:
        query = query.where(Business.avg_rating >= min_rating)

    if price_level:
        levels = [int(x) for x in price_level.split(",")]
        query = query.where(Business.price_level.in_(levels))

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Sort
    if sort == "distance" and lat is not None and lng is not None:
        point = ST_MakePoint(lng, lat)
        query = query.order_by(ST_Distance(Business.location, point))
    elif sort == "newest":
        query = query.order_by(Business.created_at.desc())
    else:
        query = query.order_by(Business.avg_rating.desc())

    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    items = list(result.scalars().all())

    response = {
        "items": [BusinessResponse(**business_to_response(b)).model_dump(mode="json") for b in items],
        "total": total,
        "page": page,
        "limit": limit,
    }

    if redis and cache_key:
        await redis.set(cache_key, json.dumps(response, default=str), ex=120)

    return response
