from datetime import datetime

from pydantic import BaseModel


class CommentCreate(BaseModel):
    text: str
    parent_comment_id: str | None = None


class CommentUpdate(BaseModel):
    text: str


class CommentResponse(BaseModel):
    id: str
    review_id: str
    business_id: str
    user_id: str
    user_display_name: str
    text: str
    parent_comment_id: str | None = None
    created_at: datetime
    updated_at: datetime
