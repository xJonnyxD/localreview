import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.service import get_user_by_id
from app.db.cassandra import cass_exec
from app.dependencies import get_current_user
from app.models import User
from app.users.schemas import UserPublic, UserResponse, UserUpdate

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    updates: dict = {}

    if data.display_name is not None:
        updates["display_name"] = data.display_name
    if data.bio is not None:
        updates["bio"] = data.bio

    if updates:
        updates["updated_at"] = now
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [current_user.id]
        await cass_exec(f"UPDATE users SET {set_clause} WHERE id = %s", values)
        await cass_exec(f"UPDATE users_by_email SET {set_clause} WHERE email = %s",
                        list(updates.values()) + [current_user.email])

        for k, v in updates.items():
            setattr(current_user, k, v)

    return current_user


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(user_id: uuid.UUID):
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user
