"""
Backup service — exporta Cassandra y archivos de uploads a ZIP.
Los backups automáticos se programan cada 12 horas desde main.py.
"""
from __future__ import annotations

import io
import json
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.db.cassandra import cass_exec

# ─── Directorios ─────────────────────────────────────────────────────────────

BACKUP_ROOT = Path("./backups")
BACKUP_DB_DIR = BACKUP_ROOT / "db"
BACKUP_WEB_DIR = BACKUP_ROOT / "web"

# ─── Tablas a exportar ───────────────────────────────────────────────────────

CASSANDRA_TABLES = [
    "users",
    "users_by_email",
    "businesses",
    "businesses_by_slug",
    "businesses_by_owner",
    "reviews",
    "reviews_by_business",
    "reviews_by_user",
    "comments",
    "comments_by_review",
    "categories",
]

# ─── Estado en memoria ───────────────────────────────────────────────────────

_backup_history: list[dict] = []
_next_backup_at: datetime | None = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _serialize(obj: Any) -> Any:
    """Convierte tipos de Cassandra a tipos JSON-serializables."""
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, (set, frozenset)):
        return [_serialize(v) for v in obj]
    if isinstance(obj, (list, tuple)):
        return [_serialize(v) for v in obj]
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    return obj


def _human_size(size_bytes: int) -> str:
    """Convierte bytes a string legible (KB, MB, GB)."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")


# ─── Backup de base de datos ─────────────────────────────────────────────────

async def backup_database() -> dict:
    """
    Exporta todas las tablas de Cassandra a archivos JSON dentro de un ZIP.
    Retorna metadata del backup creado.
    """
    BACKUP_DB_DIR.mkdir(parents=True, exist_ok=True)

    ts = _timestamp()
    filename = f"backup_db_{ts}.zip"
    filepath = BACKUP_DB_DIR / filename

    buffer = io.BytesIO()
    total_rows = 0
    tables_ok: list[str] = []
    tables_error: list[str] = []

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for table in CASSANDRA_TABLES:
            try:
                rows = list(await cass_exec(f"SELECT * FROM {table}", ()))
                serialized = [
                    {k: _serialize(v) for k, v in row.items()}
                    for row in rows
                ]
                zf.writestr(f"{table}.json", json.dumps(serialized, ensure_ascii=False, indent=2))
                total_rows += len(rows)
                tables_ok.append(table)
            except Exception as exc:
                zf.writestr(f"{table}.error.txt", str(exc))
                tables_error.append(table)

        # Manifiesto del backup
        manifest = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "type": "db",
            "tables_exported": tables_ok,
            "tables_failed": tables_error,
            "total_rows": total_rows,
        }
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))

    with open(filepath, "wb") as f:
        f.write(buffer.getvalue())

    size = filepath.stat().st_size
    entry = {
        "id": ts,
        "type": "db",
        "label": "Base de Datos",
        "filename": filename,
        "path": str(filepath),
        "size": size,
        "size_human": _human_size(size),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_rows": total_rows,
        "tables_ok": len(tables_ok),
        "tables_error": len(tables_error),
        "status": "ok" if not tables_error else "partial",
    }
    _backup_history.insert(0, entry)
    # Mantener solo los últimos 50 backups en memoria
    if len(_backup_history) > 50:
        _backup_history.pop()

    return entry


# ─── Backup de archivos web (uploads) ────────────────────────────────────────

async def backup_web() -> dict:
    """
    Comprime la carpeta uploads/ en un ZIP.
    Retorna metadata del backup creado.
    """
    BACKUP_WEB_DIR.mkdir(parents=True, exist_ok=True)

    ts = _timestamp()
    filename = f"backup_web_{ts}.zip"
    filepath = BACKUP_WEB_DIR / filename

    uploads_path = Path("./uploads")
    files_count = 0

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        if uploads_path.exists():
            for file in sorted(uploads_path.rglob("*")):
                if file.is_file():
                    arcname = file.relative_to(uploads_path.parent)
                    zf.write(file, arcname)
                    files_count += 1
        if files_count == 0:
            zf.writestr("empty.txt", "No hay archivos en uploads/")

        manifest = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "type": "web",
            "files_count": files_count,
        }
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))

    with open(filepath, "wb") as f:
        f.write(buffer.getvalue())

    size = filepath.stat().st_size
    entry = {
        "id": ts,
        "type": "web",
        "label": "Archivos Web",
        "filename": filename,
        "path": str(filepath),
        "size": size,
        "size_human": _human_size(size),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "files_count": files_count,
        "status": "ok",
    }
    _backup_history.insert(0, entry)
    if len(_backup_history) > 50:
        _backup_history.pop()

    return entry


# ─── Backup completo (DB + Web) ───────────────────────────────────────────────

async def backup_full() -> dict:
    """Ejecuta backup de DB y Web en secuencia."""
    db = await backup_database()
    web = await backup_web()
    return {"db": db, "web": web}


# ─── Estado y programación ───────────────────────────────────────────────────

def get_status() -> dict:
    return {
        "history": _backup_history[:20],
        "next_backup_at": _next_backup_at.isoformat() if _next_backup_at else None,
        "total_backups": len(_backup_history),
    }


def set_next_backup_time(dt: datetime) -> None:
    global _next_backup_at
    _next_backup_at = dt
