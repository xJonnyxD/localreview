from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.comments.schemas import CommentCreate, CommentResponse, CommentUpdate
from app.comments.service import (
    create_comment,
    delete_comment,
    format_comment,
    get_comment_by_id,
    list_comments_by_review,
    update_comment,
)
from app.dependencies import get_current_user
from app.reviews.service import get_review_by_id
from app.users.models import User

router = APIRouter(tags=["comments"])


@router.post(
    "/api/v1/reviews/{review_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_comment(
    review_id: str,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
):
    review = await get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    doc = await create_comment(
        review_id,
        str(review["business_id"]),
        str(current_user.id),
        current_user.display_name,
        data.text,
        data.parent_comment_id,
    )
    return CommentResponse(**format_comment(doc))


@router.get("/api/v1/reviews/{review_id}/comments")
async def get_comments(
    review_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Return paginated comments for a review (Bug #5 fix — no more 500-item list)."""
    items, total = await list_comments_by_review(review_id, page, limit)
    return {
        "items": [CommentResponse(**format_comment(doc)) for doc in items],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.patch("/api/v1/comments/{comment_id}", response_model=CommentResponse)
async def edit_comment(
    comment_id: str,
    data: CommentUpdate,
    current_user: User = Depends(get_current_user),
):
    doc = await get_comment_by_id(comment_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if str(doc["user_id"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    updated = await update_comment(comment_id, data.text)
    return CommentResponse(**format_comment(updated))


@router.delete("/api/v1/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user),
):
    doc = await get_comment_by_id(comment_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if str(doc["user_id"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    await delete_comment(comment_id)
