import uuid
from datetime import datetime, time

from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    icon: str | None = None
    parent_id: int | None = None

    model_config = {"from_attributes": True}


class BusinessHoursCreate(BaseModel):
    day_of_week: int
    open_time: time
    close_time: time
    is_closed: bool = False


class BusinessHoursResponse(BaseModel):
    id: int
    day_of_week: int
    open_time: time
    close_time: time
    is_closed: bool

    model_config = {"from_attributes": True}


class BusinessCreate(BaseModel):
    name: str
    description: str | None = None
    address: str
    city: str
    state: str | None = None
    postal_code: str | None = None
    country: str = "MX"
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    latitude: float
    longitude: float
    price_level: int | None = None
    category_ids: list[int] = []
    hours: list[BusinessHoursCreate] = []


class BusinessUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    price_level: int | None = None
    category_ids: list[int] | None = None


class BusinessResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID | None = None
    name: str
    slug: str
    description: str | None = None
    address: str
    city: str
    state: str | None = None
    postal_code: str | None = None
    country: str
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    price_level: int | None = None
    is_verified: bool
    is_active: bool
    avg_rating: float
    review_count: int
    photo_url: str | None = None
    categories: list[CategoryResponse] = []
    hours: list[BusinessHoursResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BusinessListResponse(BaseModel):
    items: list[BusinessResponse]
    total: int
    page: int
    limit: int
