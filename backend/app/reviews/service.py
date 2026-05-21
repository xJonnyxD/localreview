from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.reviews.schemas import ReviewCreate, ReviewUpdate


async def create_review(db: AsyncIOMotorDatabase, data: ReviewCreate, user_id: str, display_name: str, avatar_url: str | None) -> dict:
    doc = {
        "business_id": str(data.business_id),
        "user_id": user_id,
        "user_display_name": display_name,
        "user_avatar_url": avatar_url,
        "rating": data.rating,
        "title": data.title,
        "text": data.text,
        "tags": data.tags,
        "photos": [],
        "helpful_count": 0,
        "helpful_by": [],
        "status": "published",
        "owner_response": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.reviews.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def get_review_by_id(db: AsyncIOMotorDatabase, review_id: str) -> dict | None:
    return await db.reviews.find_one({"_id": ObjectId(review_id)})


async def list_reviews_by_business(
    db: AsyncIOMotorDatabase,
    business_id: str,
    page: int = 1,
    limit: int = 20,
    sort: str = "newest",
) -> tuple[list[dict], int]:
    query = {"business_id": business_id, "status": "published"}
    total = await db.reviews.count_documents(query)

    sort_field = {"newest": ("created_at", -1), "oldest": ("created_at", 1), "highest": ("rating", -1), "lowest": ("rating", 1), "helpful": ("helpful_count", -1)}
    sort_key, sort_dir = sort_field.get(sort, ("created_at", -1))

    cursor = db.reviews.find(query).sort(sort_key, sort_dir).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)
    return items, total


async def list_reviews_by_user(db: AsyncIOMotorDatabase, user_id: str, page: int = 1, limit: int = 20) -> tuple[list[dict], int]:
    query = {"user_id": user_id}
    total = await db.reviews.count_documents(query)
    cursor = db.reviews.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)
    return items, total


async def update_review(db: AsyncIOMotorDatabase, review_id: str, data: ReviewUpdate) -> dict | None:
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$set": update_data})
    return await get_review_by_id(db, review_id)


async def delete_review(db: AsyncIOMotorDatabase, review_id: str) -> bool:
    result = await db.reviews.delete_one({"_id": ObjectId(review_id)})
    return result.deleted_count > 0


async def toggle_helpful(db: AsyncIOMotorDatabase, review_id: str, user_id: str) -> dict | None:
    review = await get_review_by_id(db, review_id)
    if not review:
        return None
    if user_id in review.get("helpful_by", []):
        await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$pull": {"helpful_by": user_id}, "$inc": {"helpful_count": -1}})
    else:
        await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$push": {"helpful_by": user_id}, "$inc": {"helpful_count": 1}})
    return await get_review_by_id(db, review_id)


async def add_owner_response(db: AsyncIOMotorDatabase, review_id: str, text: str) -> dict | None:
    await db.reviews.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": {"owner_response": {"text": text, "responded_at": datetime.now(timezone.utc)}}},
    )
    return await get_review_by_id(db, review_id)


def format_review(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "business_id": doc["business_id"],
        "user_id": doc["user_id"],
        "user_display_name": doc.get("user_display_name", ""),
        "user_avatar_url": doc.get("user_avatar_url"),
        "rating": doc["rating"],
        "title": doc.get("title"),
        "text": doc["text"],
        "tags": doc.get("tags", []),
        "photos": doc.get("photos", []),
        "helpful_count": doc.get("helpful_count", 0),
        "status": doc.get("status", "published"),
        "owner_response": doc.get("owner_response"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }
