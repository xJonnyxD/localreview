import re
import uuid

from geoalchemy2.functions import ST_AsText, ST_MakePoint
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.businesses.models import Business, BusinessCategory, BusinessHours, Category
from app.businesses.schemas import BusinessCreate, BusinessUpdate


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text)


async def create_business(db: AsyncSession, data: BusinessCreate, owner_id: uuid.UUID | None = None) -> Business:
    slug = slugify(data.name)
    existing = await db.execute(select(Business).where(Business.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    business = Business(
        owner_id=owner_id,
        name=data.name,
        slug=slug,
        description=data.description,
        address=data.address,
        city=data.city,
        state=data.state,
        postal_code=data.postal_code,
        country=data.country,
        phone=data.phone,
        email=data.email,
        website=data.website,
        location=ST_MakePoint(data.longitude, data.latitude),
        price_level=data.price_level,
    )
    db.add(business)
    await db.flush()

    for cat_id in data.category_ids:
        db.add(BusinessCategory(business_id=business.id, category_id=cat_id))

    for h in data.hours:
        db.add(BusinessHours(
            business_id=business.id,
            day_of_week=h.day_of_week,
            open_time=h.open_time,
            close_time=h.close_time,
            is_closed=h.is_closed,
        ))

    await db.commit()
    return await get_business_by_id(db, business.id)


async def get_business_by_id(db: AsyncSession, business_id: uuid.UUID) -> Business | None:
    result = await db.execute(
        select(Business)
        .options(selectinload(Business.categories), selectinload(Business.hours))
        .where(Business.id == business_id)
    )
    return result.scalar_one_or_none()


async def list_businesses(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    city: str | None = None,
    category_id: int | None = None,
) -> tuple[list[Business], int]:
    query = select(Business).options(selectinload(Business.categories), selectinload(Business.hours)).where(Business.is_active == True)

    if city:
        query = query.where(Business.city.ilike(f"%{city}%"))
    if category_id:
        query = query.join(BusinessCategory).where(BusinessCategory.category_id == category_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.order_by(Business.avg_rating.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_business(db: AsyncSession, business: Business, data: BusinessUpdate) -> Business:
    for field, value in data.model_dump(exclude_unset=True, exclude={"category_ids", "latitude", "longitude"}).items():
        setattr(business, field, value)

    if data.latitude is not None and data.longitude is not None:
        business.location = ST_MakePoint(data.longitude, data.latitude)

    if data.category_ids is not None:
        await db.execute(
            BusinessCategory.__table__.delete().where(BusinessCategory.business_id == business.id)
        )
        for cat_id in data.category_ids:
            db.add(BusinessCategory(business_id=business.id, category_id=cat_id))

    await db.commit()
    return await get_business_by_id(db, business.id)


async def list_categories(db: AsyncSession) -> list[Category]:
    result = await db.execute(select(Category).order_by(Category.name))
    return list(result.scalars().all())
