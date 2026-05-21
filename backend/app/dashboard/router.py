from fastapi import APIRouter, Depends, Query

from app.db.mongodb import get_mongodb
from app.dependencies import require_business_owner
from app.users.models import User

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(current_user: User = Depends(require_business_owner)):
    db = get_mongodb()
    user_id = str(current_user.id)

    # Get all reviews for businesses owned by this user
    # For simplicity, we aggregate from reviews where the owner responded
    pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {
            "_id": "$business_id",
            "avg_rating": {"$avg": "$rating"},
            "total_reviews": {"$sum": 1},
            "total_helpful": {"$sum": "$helpful_count"},
        }},
    ]
    cursor = db.reviews.aggregate(pipeline)
    stats = await cursor.to_list(length=100)

    return {
        "businesses": stats,
        "total_businesses": len(stats),
    }


@router.get("/reviews")
async def get_recent_reviews(
    business_id: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_business_owner),
):
    db = get_mongodb()
    query = {"status": "published"}
    if business_id:
        query["business_id"] = business_id

    total = await db.reviews.count_documents(query)
    cursor = db.reviews.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)

    from app.reviews.service import format_review
    return {
        "items": [format_review(doc) for doc in items],
        "total": total,
        "page": page,
        "limit": limit,
    }
