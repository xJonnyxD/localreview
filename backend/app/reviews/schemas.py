import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PhotoItem(BaseModel):
    url: str
    thumbnail_url: str | None = None
    caption: str | None = None


class OwnerResponse(BaseModel):
    text: str
    responded_at: datetime


class ReviewCreate(BaseModel):
    business_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    title: str | None = None
    text: str
    tags: list[str] = []


class ReviewUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=5)
    title: str | None = None
    text: str | None = None
    tags: list[str] | None = None


class ReviewResponse(BaseModel):
    id: str
    business_id: str
    user_id: str
    user_display_name: str
    user_avatar_url: str | None = None
    rating: int
    title: str | None = None
    text: str
    tags: list[str] = []
    photos: list[PhotoItem] = []
    helpful_count: int = 0
    status: str = "published"
    owner_response: OwnerResponse | None = None
    created_at: datetime
    updated_at: datetime


class ReviewListResponse(BaseModel):
    items: list[ReviewResponse]
    total: int
    page: int
    limit: int


class OwnerRespondRequest(BaseModel):
    text: str
