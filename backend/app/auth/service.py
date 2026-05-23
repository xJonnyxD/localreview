from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.auth.utils import hash_password, verify_password
from app.db.cassandra import cass_exec
from app.models import User
from app.users.schemas import UserCreate


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_user(data: UserCreate) -> User:
    user_id = uuid.uuid4()
    now = _now()
    hashed = hash_password(data.password)
    email = data.email.lower().strip()

    role = "business_owner" if getattr(data, "is_business_owner", False) else "user"

    row = (
        user_id, email, hashed, data.display_name,
        None, None, role, True, "{}", now, now,
    )
    cols = "id, email, password_hash, display_name, bio, avatar_url, role, is_active, preferences, created_at, updated_at"
    placeholders = ", ".join(["%s"] * 11)

    await cass_exec(f"INSERT INTO users ({cols}) VALUES ({placeholders})", row)
    await cass_exec(f"INSERT INTO users_by_email ({cols}) VALUES ({placeholders})", row)

    return User(
        id=user_id, email=email, password_hash=hashed,
        display_name=data.display_name, role=role, is_active=True,
        created_at=now, updated_at=now,
    )


async def get_user_by_email(email: str) -> User | None:
    rows = list(await cass_exec(
        "SELECT * FROM users_by_email WHERE email = %s", (email.lower().strip(),)
    ))
    if not rows:
        return None
    return User.from_row(rows[0])


async def get_user_by_id(user_id: str | uuid.UUID) -> User | None:
    uid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
    rows = list(await cass_exec("SELECT * FROM users WHERE id = %s", (uid,)))
    if not rows:
        return None
    return User.from_row(rows[0])


async def authenticate_user(email: str, password: str) -> User | None:
    user = await get_user_by_email(email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user
