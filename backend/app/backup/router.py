"""
Backup router — endpoints para backup manual, consulta de estado y descarga.
Solo accesible por admin y business_owner.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from app.backup.service import (
    backup_database, backup_web, backup_full, get_status,
    BACKUP_DB_DIR, BACKUP_WEB_DIR,
)
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/api/v1/backup", tags=["backup"])


def _require_owner_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "business_owner"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo propietarios y administradores pueden realizar backups",
        )
    return current_user


@router.get("/status")
async def backup_status(current_user: User = Depends(_require_owner_or_admin)):
    """Retorna historial de backups y próximo backup programado."""
    return get_status()


@router.post("/db")
async def trigger_db_backup(current_user: User = Depends(_require_owner_or_admin)):
    """Inicia un backup manual de la base de datos Cassandra."""
    try:
        result = await backup_database()
        return {"ok": True, "backup": result}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear backup de BD: {exc}",
        )


@router.post("/web")
async def trigger_web_backup(current_user: User = Depends(_require_owner_or_admin)):
    """Inicia un backup manual de los archivos web (uploads)."""
    try:
        result = await backup_web()
        return {"ok": True, "backup": result}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear backup web: {exc}",
        )


@router.post("/full")
async def trigger_full_backup(current_user: User = Depends(_require_owner_or_admin)):
    """Inicia un backup completo (BD + archivos web)."""
    try:
        result = await backup_full()
        return {"ok": True, "backup": result}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear backup completo: {exc}",
        )


@router.get("/download/{backup_type}/{filename}")
async def download_backup(
    backup_type: str,
    filename: str,
    current_user: User = Depends(_require_owner_or_admin),
):
    """Descarga un archivo de backup ZIP."""
    if backup_type not in ("db", "web"):
        raise HTTPException(status_code=400, detail="Tipo de backup inválido (db o web)")

    # Seguridad: evitar path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")

    base_dir = BACKUP_DB_DIR if backup_type == "db" else BACKUP_WEB_DIR
    filepath = base_dir / filename

    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Archivo de backup no encontrado")

    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
