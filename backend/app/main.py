import asyncio
import logging
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(  # type: ignore[attr-defined]
        asyncio.WindowsSelectorEventLoopPolicy()  # type: ignore[attr-defined]
    )

from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.auth.router import router as auth_router
from app.backup.router import router as backup_router
from app.businesses.router import router as businesses_router
from app.comments.router import router as comments_router
from app.dashboard.router import router as dashboard_router
from app.db.cassandra import close_cassandra, connect_cassandra
from app.photos.router import router as photos_router
from app.reviews.router import router as reviews_router
from app.search.router import router as search_router
from app.users.router import router as users_router
from app.backup.service import backup_full, set_next_backup_time

logger = logging.getLogger(__name__)

AUTO_BACKUP_INTERVAL_HOURS = 12


async def _auto_backup_loop() -> None:
    """
    Tarea en segundo plano: ejecuta un backup completo cada 12 horas.
    Programa el próximo backup y lo registra para mostrarlo en el UI.
    """
    while True:
        next_at = datetime.now(timezone.utc) + timedelta(hours=AUTO_BACKUP_INTERVAL_HOURS)
        set_next_backup_time(next_at)
        logger.info(
            "Próximo backup automático programado: %s",
            next_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
        )
        await asyncio.sleep(AUTO_BACKUP_INTERVAL_HOURS * 3600)
        try:
            logger.info("Iniciando backup automático...")
            await backup_full()
            logger.info("Backup automático completado.")
        except Exception as exc:
            logger.error("Error en backup automático: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_cassandra()
    backup_task = asyncio.create_task(_auto_backup_loop())
    yield
    backup_task.cancel()
    try:
        await backup_task
    except asyncio.CancelledError:
        pass
    await close_cassandra()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(businesses_router)
app.include_router(reviews_router)
app.include_router(comments_router)
app.include_router(search_router)
app.include_router(photos_router)
app.include_router(dashboard_router)
app.include_router(backup_router)


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
