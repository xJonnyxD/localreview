import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

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
from app.dependencies import get_current_user, require_business_owner
from app.models import User

router = APIRouter(prefix="/api/v1/businesses", tags=["businesses"])


@router.get("/categories", response_model=list[CategoryResponse])
async def get_categories():
    return await list_categories()


@router.get("", response_model=BusinessListResponse)
async def get_businesses(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    city: str | None = None,
    category_id: int | None = None,
):
    items, total = await list_businesses(page, limit, city, category_id)
    return BusinessListResponse(
        items=[BusinessResponse(**b.to_response_dict()) for b in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_new_business(
    data: BusinessCreate,
    current_user: User = Depends(require_business_owner),
):
    business = await create_business(data, owner_id=current_user.id)
    return BusinessResponse(**business.to_response_dict())


@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(business_id: uuid.UUID):
    business = await get_business_by_id(business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Negocio no encontrado")
    return BusinessResponse(**business.to_response_dict())


@router.patch("/{business_id}", response_model=BusinessResponse)
async def update_existing_business(
    business_id: uuid.UUID,
    data: BusinessUpdate,
    current_user: User = Depends(get_current_user),
):
    business = await get_business_by_id(business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Negocio no encontrado")
    if business.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")
    updated = await update_business(business, data)
    return BusinessResponse(**updated.to_response_dict())
