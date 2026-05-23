"""
Reviews service — backed by Apache Cassandra.

All writes go to three tables:
  reviews              (lookup by id)
  reviews_by_business  (list by business, newest-first)
  reviews_by_user      (list by user, newest-first)

cassandra-driver note: use %s (not ?) as positional parameter placeholders
when calling session.execute(str_query, params).  The ? syntax is reserved
for PreparedStatement objects returned by session.prepare().
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.db.cassandra import cass_exec
from app.reviews.schemas import ReviewCreate, ReviewUpdate


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─── Write operations ────────────────────────────────────────────────────────

async def create_review(
    data: ReviewCreate,
    user_id: str,
    display_name: str,
    avatar_url: str | None,
) -> dict:
    rid = uuid.uuid4()
    biz_id = uuid.UUID(str(data.business_id))
    uid = uuid.UUID(user_id)
    now = _now()

    params = (
        rid, biz_id, uid, display_name, avatar_url,
        data.rating, data.title, data.text, list(data.tags or []), [],
        0, set(), "published",
        None, None,
        now, now,
    )

    await cass_exec(
        """
        INSERT INTO reviews (
            id, business_id, user_id, user_display_name, user_avatar_url,
            rating, title, body, tags, photos,
            helpful_count, helpful_by, status,
            owner_resp_text, owner_resp_at,
            created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        params,
    )

    await cass_exec(
        """
        INSERT INTO reviews_by_business (
            business_id, created_at, id,
            user_id, user_display_name, user_avatar_url,
            rating, title, body, tags, photos,
            helpful_count, helpful_by, status,
            owner_resp_text, owner_resp_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            biz_id, now, rid,
            uid, display_name, avatar_url,
            data.rating, data.title, data.text, list(data.tags or []), [],
            0, set(), "published",
            None, None, now,
        ),
    )

    await cass_exec(
        """
        INSERT INTO reviews_by_user (
            user_id, created_at, id,
            business_id, user_display_name, user_avatar_url,
            rating, title, body, tags, photos,
            helpful_count, helpful_by, status,
            owner_resp_text, owner_resp_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            uid, now, rid,
            biz_id, display_name, avatar_url,
            data.rating, data.title, data.text, list(data.tags or []), [],
            0, set(), "published",
            None, None, now,
        ),
    )

    return {
        "id": rid, "business_id": biz_id, "user_id": uid,
        "user_display_name": display_name, "user_avatar_url": avatar_url,
        "rating": data.rating, "title": data.title, "body": data.text,
        "tags": list(data.tags or []), "photos": [], "helpful_count": 0,
        "helpful_by": set(), "status": "published",
        "owner_resp_text": None, "owner_resp_at": None,
        "created_at": now, "updated_at": now,
    }


async def get_review_by_id(review_id: str) -> dict | None:
    rows = list(await cass_exec(
        "SELECT * FROM reviews WHERE id = %s",
        (uuid.UUID(review_id),),
    ))
    return rows[0] if rows else None


async def list_reviews_by_business(
    business_id: str,
    page: int = 1,
    limit: int = 20,
    sort: str = "newest",
) -> tuple[list[dict], int]:
    biz_uuid = uuid.UUID(business_id)

    # All rows in one partition — cheap COUNT
    count_rows = list(await cass_exec(
        "SELECT COUNT(*) FROM reviews_by_business WHERE business_id = %s",
        (biz_uuid,),
    ))
    total_raw = count_rows[0]["count"] if count_rows else 0

    if total_raw == 0:
        return [], 0

    all_rows = list(await cass_exec(
        "SELECT * FROM reviews_by_business WHERE business_id = %s",
        (biz_uuid,),
    ))
    rows = [r for r in all_rows if r.get("status") == "published"]
    total = len(rows)

    sort_map = {
        "newest":  (lambda r: r["created_at"], True),
        "oldest":  (lambda r: r["created_at"], False),
        "highest": (lambda r: r["rating"],     True),
        "lowest":  (lambda r: r["rating"],     False),
        "helpful": (lambda r: r.get("helpful_count") or 0, True),
    }
    key_fn, reverse = sort_map.get(sort, sort_map["newest"])
    rows.sort(key=key_fn, reverse=reverse)

    start = (page - 1) * limit
    return rows[start: start + limit], total


async def list_reviews_by_user(
    user_id: str,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[dict], int]:
    uid = uuid.UUID(user_id)

    count_rows = list(await cass_exec(
        "SELECT COUNT(*) FROM reviews_by_user WHERE user_id = %s",
        (uid,),
    ))
    total_raw = count_rows[0]["count"] if count_rows else 0

    if total_raw == 0:
        return [], 0

    all_rows = list(await cass_exec(
        "SELECT * FROM reviews_by_user WHERE user_id = %s",
        (uid,),
    ))
    rows = sorted(all_rows, key=lambda r: r["created_at"], reverse=True)
    start = (page - 1) * limit
    return rows[start: start + limit], total_raw


async def update_review(review_id: str, data: ReviewUpdate) -> dict | None:
    existing = await get_review_by_id(review_id)
    if not existing:
        return None

    rid = uuid.UUID(review_id)
    now = _now()
    updates: dict = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    updates["updated_at"] = now

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [rid]
    await cass_exec(f"UPDATE reviews SET {set_clause} WHERE id = %s", values)

    biz_id = existing["business_id"]
    uid = existing["user_id"]
    created_at = existing["created_at"]

    for table, pk_col, pk_val in [
        ("reviews_by_business", "business_id", biz_id),
        ("reviews_by_user",     "user_id",     uid),
    ]:
        non_ts_updates = {k: v for k, v in updates.items() if k != "updated_at"}
        set2 = ", ".join(f"{k} = %s" for k in non_ts_updates) + ", updated_at = %s"
        vals2 = list(non_ts_updates.values()) + [now, pk_val, created_at, rid]
        await cass_exec(
            f"UPDATE {table} SET {set2} WHERE {pk_col} = %s AND created_at = %s AND id = %s",
            vals2,
        )

    return await get_review_by_id(review_id)


async def delete_review(review_id: str) -> bool:
    existing = await get_review_by_id(review_id)
    if not existing:
        return False

    rid = uuid.UUID(review_id)
    biz_id = existing["business_id"]
    uid = existing["user_id"]
    created_at = existing["created_at"]

    await cass_exec("DELETE FROM reviews WHERE id = %s", (rid,))
    await cass_exec(
        "DELETE FROM reviews_by_business WHERE business_id = %s AND created_at = %s AND id = %s",
        (biz_id, created_at, rid),
    )
    await cass_exec(
        "DELETE FROM reviews_by_user WHERE user_id = %s AND created_at = %s AND id = %s",
        (uid, created_at, rid),
    )
    return True


async def toggle_helpful(review_id: str, user_id: str) -> dict | None:
    existing = await get_review_by_id(review_id)
    if not existing:
        return None

    rid = uuid.UUID(review_id)
    helpful_by: set = existing.get("helpful_by") or set()

    current_count = int(existing.get("helpful_count") or 0)
    if user_id in helpful_by:
        new_count = max(0, current_count - 1)
        await cass_exec(
            "UPDATE reviews SET helpful_by = helpful_by - %s, helpful_count = %s WHERE id = %s",
            ({user_id}, new_count, rid),
        )
    else:
        new_count = current_count + 1
        await cass_exec(
            "UPDATE reviews SET helpful_by = helpful_by + %s, helpful_count = %s WHERE id = %s",
            ({user_id}, new_count, rid),
        )

    return await get_review_by_id(review_id)


async def add_owner_response(review_id: str, text: str) -> dict | None:
    existing = await get_review_by_id(review_id)
    if not existing:
        return None

    rid = uuid.UUID(review_id)
    now = _now()
    biz_id = existing["business_id"]
    uid = existing["user_id"]
    created_at = existing["created_at"]

    await cass_exec(
        "UPDATE reviews SET owner_resp_text = %s, owner_resp_at = %s, updated_at = %s WHERE id = %s",
        (text, now, now, rid),
    )
    await cass_exec(
        "UPDATE reviews_by_business SET owner_resp_text = %s, owner_resp_at = %s, updated_at = %s "
        "WHERE business_id = %s AND created_at = %s AND id = %s",
        (text, now, now, biz_id, created_at, rid),
    )
    await cass_exec(
        "UPDATE reviews_by_user SET owner_resp_text = %s, owner_resp_at = %s, updated_at = %s "
        "WHERE user_id = %s AND created_at = %s AND id = %s",
        (text, now, now, uid, created_at, rid),
    )
    return await get_review_by_id(review_id)


async def push_photo_to_review(review_id: str, user_id: str, photo_url: str) -> bool:
    """Append a photo URL to a review's photos list (called by photos router)."""
    existing = await get_review_by_id(review_id)
    if not existing or str(existing.get("user_id")) != user_id:
        return False

    rid = uuid.UUID(review_id)
    photos = list(existing.get("photos") or []) + [photo_url]
    now = _now()
    biz_id = existing["business_id"]
    uid = existing["user_id"]
    created_at = existing["created_at"]

    await cass_exec(
        "UPDATE reviews SET photos = %s, updated_at = %s WHERE id = %s",
        (photos, now, rid),
    )
    await cass_exec(
        "UPDATE reviews_by_business SET photos = %s, updated_at = %s "
        "WHERE business_id = %s AND created_at = %s AND id = %s",
        (photos, now, biz_id, created_at, rid),
    )
    await cass_exec(
        "UPDATE reviews_by_user SET photos = %s, updated_at = %s "
        "WHERE user_id = %s AND created_at = %s AND id = %s",
        (photos, now, uid, created_at, rid),
    )
    return True


# ─── Formatter ───────────────────────────────────────────────────────────────

def format_review(row: dict) -> dict:
    owner_resp = None
    if row.get("owner_resp_text"):
        owner_resp = {
            "text": row["owner_resp_text"],
            "responded_at": row.get("owner_resp_at"),
        }
    return {
        "id": str(row["id"]),
        "business_id": str(row["business_id"]),
        "user_id": str(row["user_id"]),
        "user_display_name": row.get("user_display_name") or "",
        "user_avatar_url": row.get("user_avatar_url"),
        "rating": row["rating"],
        "title": row.get("title"),
        "text": row.get("body") or row.get("text") or "",
        "tags": list(row.get("tags") or []),
        "photos": list(row.get("photos") or []),
        "helpful_count": row.get("helpful_count") or 0,
        "status": row.get("status") or "published",
        "owner_response": owner_resp,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
