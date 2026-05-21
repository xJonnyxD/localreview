import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.businesses.schemas import (
    BusinessCreate,
    BusinessListResponse,
    BusinessResponse,
    BusinessUpdate,
    CategoryResponse,
)
from app.businesses.service import (
    create_business,
    get_business_by_id,
    list_businesses,
    list_categories,
    update_business,
)
from app.db.postgres import get_db
from app.db.redis import get_redis
from app.dependencies import get_current_user, require_business_owner
from app.users.models import User

router = APIRouter(prefix="/api/v1/businesses", tags=["businesses"])


def business_to_response(b) -> dict:
    data = {c.key: getattr(b, c.key) for c in b.__table__.columns if c.key != "location"}
    data["latitude"] = None
    data["longitude"] = None
    data["categories"] = b.categories
    data["hours"] = b.hours
    return data


@router.get("/categories", response_model=list[CategoryResponse])
async def get_categories(db: AsyncSession = Depends(get_db)):
    return await list_categories(db)


@router.get("", response_model=BusinessListResponse)
async def get_businesses(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    city: str | None = None,
    category_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_businesses(db, page, limit, city, category_id)
    return BusinessListResponse(
        items=[BusinessResponse(**business_to_response(b)) for b in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_new_business(
    data: BusinessCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_business_owner),
):
    business = await create_business(db, data, owner_id=current_user.id)
    return BusinessResponse(**business_to_response(business))


@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(business_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    redis = get_redis()
    cache_key = f"business:detail:{business_id}"
    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return BusinessResponse(**json.loads(cached))

    business = await get_business_by_id(db, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    response_data = business_to_response(business)

    if redis:
        await redis.set(cache_key, json.dumps(response_data, default=str), ex=600)

    return BusinessResponse(**response_data)


@router.patch("/{business_id}", response_model=BusinessResponse)
async def update_existing_business(
    business_id: uuid.UUID,
    data: BusinessUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await get_business_by_id(db, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    if business.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    updated = await update_business(db, business, data)
    return BusinessResponse(**business_to_response(updated))
