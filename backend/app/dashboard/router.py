import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.businesses.models import Business
from app.db.cassandra import cass_exec
from app.db.postgres import get_db
from app.dependencies import require_business_owner
from app.users.models import User

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


async def _get_owner_business_ids(pg: AsyncSession, owner_id: str) -> list[str]:
    """Return list of business_id strings owned by the given user."""
    result = await pg.execute(
        select(Business.id).where(Business.owner_id == owner_id)
    )
    return [str(row[0]) for row in result.all()]


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(require_business_owner),
    pg: AsyncSession = Depends(get_db),
):
    """
    Bug #1 fix — only show stats for businesses owned by current user.
    Aggregation data is read from Cassandra (reviews_by_business table).
    """
    owner_id = str(current_user.id)
    biz_ids = await _get_owner_business_ids(pg, owner_id)

    if not biz_ids:
        return {"businesses": [], "total_businesses": 0}

    stats = []
    for biz_id in biz_ids:
        biz_uuid = uuid.UUID(biz_id)

        rows = await cass_exec(
            "SELECT rating, helpful_count FROM reviews_by_business WHERE business_id = %s",
            (biz_uuid,),
        )
        rows = [r for r in rows if r is not None]

        if rows:
            avg_rating = sum(r["rating"] for r in rows) / len(rows)
            total_reviews = len(rows)
            total_helpful = sum(r.get("helpful_count") or 0 for r in rows)
        else:
            avg_rating = 0.0
            total_reviews = 0
            total_helpful = 0

        stats.append({
            "business_id": biz_id,
            "avg_rating": round(avg_rating, 2),
            "total_reviews": total_reviews,
            "total_helpful": total_helpful,
        })

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
    pg: AsyncSession = Depends(get_db),
):
    """
    Bug #1 fix — owner only sees their own businesses' reviews.
    Reviews are read from Cassandra (reviews_by_business table).
    """
    owner_id = str(current_user.id)
    owner_biz_ids = await _get_owner_business_ids(pg, owner_id)

    if not owner_biz_ids:
        return {"items": [], "total": 0, "page": page, "limit": limit}

    # If a specific business_id was requested, verify ownership
    if business_id:
        if business_id not in owner_biz_ids:
            return {"items": [], "total": 0, "page": page, "limit": limit}
        target_ids = [business_id]
    else:
        target_ids = owner_biz_ids

    # Collect reviews from Cassandra for each owned business
    all_reviews: list[dict] = []
    for biz_id in target_ids:
        rows = await cass_exec(
            "SELECT * FROM reviews_by_business WHERE business_id = %s",
            (uuid.UUID(biz_id),),
        )
        rows = [r for r in rows if r.get("status") == "published"]
        all_reviews.extend(rows)

    # Sort by created_at descending
    all_reviews.sort(key=lambda r: r["created_at"], reverse=True)
    total = len(all_reviews)

    start = (page - 1) * limit
    page_items = all_reviews[start: start + limit]

    from app.reviews.service import format_review
    return {
        "items": [format_review(r) for r in page_items],
        "total": total,
        "page": page,
        "limit": limit,
    }
