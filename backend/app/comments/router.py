from fastapi import APIRouter, Depends, HTTPException, status

from app.comments.schemas import CommentCreate, CommentResponse, CommentUpdate
from app.comments.service import (
    create_comment,
    delete_comment,
    format_comment,
    get_comment_by_id,
    list_comments_by_review,
    update_comment,
)
from app.db.mongodb import get_mongodb
from app.dependencies import get_current_user
from app.reviews.service import get_review_by_id
from app.users.models import User

router = APIRouter(tags=["comments"])


@router.post("/api/v1/reviews/{review_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(review_id: str, data: CommentCreate, current_user: User = Depends(get_current_user)):
    db = get_mongodb()
    review = await get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    doc = await create_comment(
        db, review_id, review["business_id"], str(current_user.id),
        current_user.display_name, data.text, data.parent_comment_id,
    )
    return CommentResponse(**format_comment(doc))


@router.get("/api/v1/reviews/{review_id}/comments", response_model=list[CommentResponse])
async def get_comments(review_id: str):
    db = get_mongodb()
    items = await list_comments_by_review(db, review_id)
    return [CommentResponse(**format_comment(doc)) for doc in items]


@router.patch("/api/v1/comments/{comment_id}", response_model=CommentResponse)
async def edit_comment(comment_id: str, data: CommentUpdate, current_user: User = Depends(get_current_user)):
    db = get_mongodb()
    doc = await get_comment_by_id(db, comment_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if doc["user_id"] != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    updated = await update_comment(db, comment_id, data.text)
    return CommentResponse(**format_comment(updated))


@router.delete("/api/v1/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    db = get_mongodb()
    doc = await get_comment_by_id(db, comment_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if doc["user_id"] != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    await delete_comment(db, comment_id)
