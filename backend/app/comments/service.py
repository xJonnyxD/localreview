from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


async def create_comment(db: AsyncIOMotorDatabase, review_id: str, business_id: str, user_id: str, display_name: str, text: str, parent_comment_id: str | None = None) -> dict:
    doc = {
        "review_id": review_id,
        "business_id": business_id,
        "user_id": user_id,
        "user_display_name": display_name,
        "text": text,
        "parent_comment_id": parent_comment_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.comments.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def list_comments_by_review(db: AsyncIOMotorDatabase, review_id: str) -> list[dict]:
    cursor = db.comments.find({"review_id": review_id}).sort("created_at", 1)
    return await cursor.to_list(length=500)


async def update_comment(db: AsyncIOMotorDatabase, comment_id: str, text: str) -> dict | None:
    await db.comments.update_one(
        {"_id": ObjectId(comment_id)},
        {"$set": {"text": text, "updated_at": datetime.now(timezone.utc)}},
    )
    return await db.comments.find_one({"_id": ObjectId(comment_id)})


async def delete_comment(db: AsyncIOMotorDatabase, comment_id: str) -> bool:
    result = await db.comments.delete_one({"_id": ObjectId(comment_id)})
    return result.deleted_count > 0


async def get_comment_by_id(db: AsyncIOMotorDatabase, comment_id: str) -> dict | None:
    return await db.comments.find_one({"_id": ObjectId(comment_id)})


def format_comment(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "review_id": doc["review_id"],
        "business_id": doc["business_id"],
        "user_id": doc["user_id"],
        "user_display_name": doc.get("user_display_name", ""),
        "text": doc["text"],
        "parent_comment_id": doc.get("parent_comment_id"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }
