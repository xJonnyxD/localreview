"""
Celery tasks for cross-database synchronization.

Rating sync: MongoDB -> PostgreSQL
When a review is created/updated/deleted, recalculate avg_rating and review_count.

Usage (after Celery is configured):
    from app.sync.tasks import recalculate_business_rating
    recalculate_business_rating.delay(business_id)
"""

import asyncio

from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import settings


async def _recalculate_rating(business_id: str):
    # MongoDB: aggregate rating
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    mongo_db = mongo_client[settings.MONGODB_DB]

    pipeline = [
        {"$match": {"business_id": business_id, "status": "published"}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    cursor = mongo_db.reviews.aggregate(pipeline)
    results = await cursor.to_list(length=1)
    mongo_client.close()

    avg_rating = round(results[0]["avg"], 2) if results else 0
    review_count = results[0]["count"] if results else 0

    # PostgreSQL: update business
    engine = create_async_engine(settings.postgres_url)
    async_sess = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    from app.businesses.models import Business

    async with async_sess() as session:
        await session.execute(
            update(Business)
            .where(Business.id == business_id)
            .values(avg_rating=avg_rating, review_count=review_count)
        )
        await session.commit()
    await engine.dispose()


def recalculate_business_rating(business_id: str):
    """Synchronous wrapper for use with Celery or direct calls."""
    asyncio.run(_recalculate_rating(business_id))
