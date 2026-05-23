"""
Backup router — endpoints para backup manual y consulta de estado.
Solo accesible por admin y business_owner.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.backup.service import backup_database, backup_web, backup_full, get_status
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
