import sys
if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(  # type: ignore[attr-defined]
        asyncio.WindowsSelectorEventLoopPolicy()  # type: ignore[attr-defined]
    )

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.auth.router import router as auth_router
from app.businesses.router import router as businesses_router
from app.comments.router import router as comments_router
from app.dashboard.router import router as dashboard_router
from app.db.cassandra import close_cassandra, connect_cassandra
from app.photos.router import router as photos_router
from app.reviews.router import router as reviews_router
from app.search.router import router as search_router
from app.users.router import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_cassandra()
    yield
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


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
