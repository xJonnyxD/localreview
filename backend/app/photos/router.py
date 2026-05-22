import os
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from PIL import Image

from app.config import settings
from app.dependencies import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/v1/photos", tags=["photos"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_photo(
    file: UploadFile,
    review_id: str | None = Form(None),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed. Use JPEG, PNG, or WebP",
        )

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Max 10 MB",
        )

    file_id = uuid.uuid4().hex
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{file_id}.{ext}"
    thumb_filename = f"{file_id}_thumb.{ext}"

    photo_dir = os.path.join(settings.UPLOAD_DIR, "photos")
    os.makedirs(photo_dir, exist_ok=True)

    filepath = os.path.join(photo_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    # Generate thumbnail
    try:
        img = Image.open(filepath)
        img.thumbnail((300, 300))
        thumb_path = os.path.join(photo_dir, thumb_filename)
        img.save(thumb_path)
    except Exception:
        thumb_filename = filename

    photo_url = f"/uploads/photos/{filename}"
    thumb_url = f"/uploads/photos/{thumb_filename}"

    # Bug #4 fix — link photo to the Cassandra review if review_id provided
    if review_id:
        try:
            from app.reviews.service import push_photo_to_review
            await push_photo_to_review(review_id, str(current_user.id), photo_url)
        except Exception:
            # Don't fail the upload if linking fails
            pass

    return {
        "url": photo_url,
        "thumbnail_url": thumb_url,
        "filename": filename,
    }
