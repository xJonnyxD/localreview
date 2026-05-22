"""
Background task: recalculate avg_rating and review_count in PostgreSQL
after a review is created / updated / deleted in Cassandra.

Called via FastAPI BackgroundTasks (non-Celery for Phase 1).
"""
from __future__ import annotations

import asyncio
import sys
import types
import uuid
from concurrent.futures import ThreadPoolExecutor

# asyncore shim — same as in app/db/cassandra.py (tasks module imports cassandra directly)
if "asyncore" not in sys.modules:
    _a = types.ModuleType("asyncore")
    class _D:
        def __init__(self, sock=None, map=None): pass
        def set_socket(self, sock, map=None): pass
        def close(self): pass
    _a.dispatcher = _D  # type: ignore[attr-defined]
    _a.loop = lambda **kw: None  # type: ignore[attr-defined]
    _a.socket_map = {}  # type: ignore[attr-defined]
    sys.modules["asyncore"] = _a

from cassandra.cluster import Cluster
from cassandra.io.asyncioreactor import AsyncioConnection
from cassandra.policies import DCAwareRoundRobinPolicy
from cassandra.query import dict_factory
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

_executor = ThreadPoolExecutor(max_workers=5, thread_name_prefix="sync")


def _cassandra_aggregate(business_id: str) -> tuple[float, int]:
    """Blocking: open a short-lived Cassandra session and aggregate ratings."""
    cluster = Cluster(
        contact_points=settings.CASSANDRA_HOSTS,
        port=settings.CASSANDRA_PORT,
        connection_class=AsyncioConnection,
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc="datacenter1"),
    )
    try:
        session = cluster.connect(settings.CASSANDRA_KEYSPACE)
        session.row_factory = dict_factory
        rows = list(
            session.execute(
                "SELECT rating FROM reviews_by_business WHERE business_id = %s",
                (uuid.UUID(business_id),),
            )
        )
    finally:
        cluster.shutdown()

    if not rows:
        return 0.0, 0

    ratings = [r["rating"] for r in rows if r.get("rating") is not None]
    avg = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
    return avg, len(ratings)


async def _recalculate_rating(business_id: str) -> None:
    """Async: compute avg_rating from Cassandra, persist to PostgreSQL."""
    loop = asyncio.get_event_loop()
    avg_rating, review_count = await loop.run_in_executor(
        _executor, _cassandra_aggregate, business_id
    )

    engine = create_async_engine(settings.postgres_url)
    async_sess = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    from app.businesses.models import Business

    async with async_sess() as session:
        await session.execute(
            update(Business)
            .where(Business.id == business_id)
            .values(avg_rating=avg_rating, review_count=review_count)
        )
        await session.commit()
    await engine.dispose()


def recalculate_business_rating(business_id: str) -> None:
    """Synchronous wrapper (legacy Celery compatibility)."""
    asyncio.run(_recalculate_rating(business_id))
