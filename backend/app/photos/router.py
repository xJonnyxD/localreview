import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from PIL import Image

from app.config import settings
from app.dependencies import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/v1/photos", tags=["photos"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload")
async def upload_photo(file: UploadFile, current_user: User = Depends(get_current_user)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File type not allowed. Use JPEG, PNG, or WebP")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large. Max 10MB")

    file_id = uuid.uuid4().hex
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
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

    return {
        "url": f"/uploads/photos/{filename}",
        "thumbnail_url": f"/uploads/photos/{thumb_filename}",
        "filename": filename,
    }
