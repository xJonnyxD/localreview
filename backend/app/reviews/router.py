import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from app.dependencies import get_current_user
from app.reviews.schemas import (
    OwnerRespondRequest,
    ReviewCreate,
    ReviewListResponse,
    ReviewResponse,
    ReviewUpdate,
)
from app.reviews.service import (
    add_owner_response,
    create_review,
    delete_review,
    format_review,
    get_review_by_id,
    list_reviews_by_business,
    list_reviews_by_user,
    toggle_helpful,
    update_review,
)
from app.sync.tasks import _recalculate_rating
from app.models import User

router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_new_review(
    data: ReviewCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    doc = await create_review(data, str(current_user.id), current_user.display_name, current_user.avatar_url)
    background_tasks.add_task(_recalculate_rating, str(data.business_id))
    return ReviewResponse(**format_review(doc))


@router.get("/business/{business_id}", response_model=ReviewListResponse)
async def get_business_reviews(
    business_id: uuid.UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("newest"),
):
    items, total = await list_reviews_by_business(str(business_id), page, limit, sort)
    return ReviewListResponse(
        items=[ReviewResponse(**format_review(doc)) for doc in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/user/{user_id}", response_model=ReviewListResponse)
async def get_user_reviews(
    user_id: uuid.UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    items, total = await list_reviews_by_user(str(user_id), page, limit)
    return ReviewListResponse(
        items=[ReviewResponse(**format_review(doc)) for doc in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(review_id: str):
    doc = await get_review_by_id(review_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return ReviewResponse(**format_review(doc))


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_existing_review(
    review_id: str,
    data: ReviewUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    doc = await get_review_by_id(review_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if str(doc["user_id"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    updated = await update_review(review_id, data)
    background_tasks.add_task(_recalculate_rating, str(doc["business_id"]))
    return ReviewResponse(**format_review(updated))


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_review(
    review_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    doc = await get_review_by_id(review_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if str(doc["user_id"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    await delete_review(review_id)
    background_tasks.add_task(_recalculate_rating, str(doc["business_id"]))


@router.post("/{review_id}/helpful", response_model=ReviewResponse)
async def toggle_helpful_vote(review_id: str, current_user: User = Depends(get_current_user)):
    updated = await toggle_helpful(review_id, str(current_user.id))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return ReviewResponse(**format_review(updated))


@router.post("/{review_id}/respond", response_model=ReviewResponse)
async def respond_to_review(
    review_id: str,
    data: OwnerRespondRequest,
    current_user: User = Depends(get_current_user),
):
    doc = await get_review_by_id(review_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if current_user.role not in ("business_owner", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only business owners can respond")
    updated = await add_owner_response(review_id, data.text)
    return ReviewResponse(**format_review(updated))
