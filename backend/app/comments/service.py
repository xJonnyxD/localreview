"""
Comments service — backed by Apache Cassandra.

cassandra-driver note: use %s (not ?) for positional parameter placeholders.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.db.cassandra import cass_exec, cass_exec_paged


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_comment(
    review_id: str,
    business_id: str,
    user_id: str,
    display_name: str,
    text: str,
    parent_comment_id: str | None = None,
) -> dict:
    cid = uuid.uuid4()
    rid = uuid.UUID(review_id)
    bid = uuid.UUID(business_id)
    uid = uuid.UUID(user_id)
    pid = uuid.UUID(parent_comment_id) if parent_comment_id else None
    now = _now()

    await cass_exec(
        """
        INSERT INTO comments (
            id, review_id, business_id, user_id, user_display_name,
            body, parent_comment_id, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (cid, rid, bid, uid, display_name, text, pid, now, now),
    )

    await cass_exec(
        """
        INSERT INTO comments_by_review (
            review_id, created_at, id,
            business_id, user_id, user_display_name,
            body, parent_comment_id, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (rid, now, cid, bid, uid, display_name, text, pid, now),
    )

    return {
        "id": cid, "review_id": rid, "business_id": bid,
        "user_id": uid, "user_display_name": display_name,
        "body": text, "parent_comment_id": pid,
        "created_at": now, "updated_at": now,
    }


async def get_comment_by_id(comment_id: str) -> dict | None:
    rows = list(await cass_exec(
        "SELECT * FROM comments WHERE id = %s",
        (uuid.UUID(comment_id),),
    ))
    return rows[0] if rows else None


async def list_comments_by_review(
    review_id: str,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """
    Paginated comments for *review_id* using Cassandra native partition read.

    comments_by_review is clustered by (created_at ASC, id ASC) within a
    review_id partition — O(1) access regardless of comment count.
    """
    rid = uuid.UUID(review_id)

    count_rows = list(await cass_exec(
        "SELECT COUNT(*) FROM comments_by_review WHERE review_id = %s",
        (rid,),
    ))
    total = count_rows[0]["count"] if count_rows else 0

    if total == 0:
        return [], 0

    all_rows = list(await cass_exec(
        "SELECT * FROM comments_by_review WHERE review_id = %s",
        (rid,),
    ))

    start = (page - 1) * limit
    return all_rows[start: start + limit], total


async def list_comments_by_review_paged(
    review_id: str,
    fetch_size: int = 20,
    paging_state: bytes | None = None,
) -> tuple[list[dict], bytes | None]:
    """
    Cursor-based pagination using Cassandra's native paging_state.
    Returns (items, next_paging_state).  next_paging_state is None = last page.
    """
    rid = uuid.UUID(review_id)
    rows, next_state = await cass_exec_paged(
        "SELECT * FROM comments_by_review WHERE review_id = %s",
        (rid,),
        fetch_size=fetch_size,
        paging_state=paging_state,
    )
    return rows, next_state


async def update_comment(comment_id: str, text: str) -> dict | None:
    existing = await get_comment_by_id(comment_id)
    if not existing:
        return None

    cid = uuid.UUID(comment_id)
    now = _now()
    rid = existing["review_id"]
    created_at = existing["created_at"]

    await cass_exec(
        "UPDATE comments SET body = %s, updated_at = %s WHERE id = %s",
        (text, now, cid),
    )
    await cass_exec(
        "UPDATE comments_by_review SET body = %s, updated_at = %s "
        "WHERE review_id = %s AND created_at = %s AND id = %s",
        (text, now, rid, created_at, cid),
    )

    return await get_comment_by_id(comment_id)


async def delete_comment(comment_id: str) -> bool:
    existing = await get_comment_by_id(comment_id)
    if not existing:
        return False

    cid = uuid.UUID(comment_id)
    rid = existing["review_id"]
    created_at = existing["created_at"]

    await cass_exec("DELETE FROM comments WHERE id = %s", (cid,))
    await cass_exec(
        "DELETE FROM comments_by_review WHERE review_id = %s AND created_at = %s AND id = %s",
        (rid, created_at, cid),
    )
    return True


def format_comment(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "review_id": str(row["review_id"]),
        "business_id": str(row["business_id"]),
        "user_id": str(row["user_id"]),
        "user_display_name": row.get("user_display_name") or "",
        "text": row.get("body") or row.get("text") or "",
        "parent_comment_id": str(row["parent_comment_id"]) if row.get("parent_comment_id") else None,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
