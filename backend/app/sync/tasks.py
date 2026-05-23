"""
Background task: recalcula avg_rating y review_count en la tabla businesses
de Cassandra después de crear / editar / eliminar una reseña.

Se ejecuta via FastAPI BackgroundTasks (sin Celery).
"""
from __future__ import annotations

import asyncio
import sys
import types
import uuid
from concurrent.futures import ThreadPoolExecutor

# asyncore shim — necesario para cassandra-driver en Python 3.12+
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

from app.config import settings

_executor = ThreadPoolExecutor(max_workers=5, thread_name_prefix="sync")


def _cassandra_aggregate(business_id: str) -> tuple[float, int]:
    """Bloqueante: abre sesión Cassandra temporal y agrega ratings."""
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
        ratings = [r["rating"] for r in rows if r.get("rating") is not None]
        avg = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
        count = len(ratings)

        # Actualizar businesses en Cassandra
        session.execute(
            "UPDATE businesses SET avg_rating = %s, review_count = %s WHERE id = %s",
            (avg, count, uuid.UUID(business_id)),
        )
    finally:
        cluster.shutdown()

    return avg, count


async def _recalculate_rating(business_id: str) -> None:
    """Async: calcula avg_rating desde Cassandra y lo persiste en businesses."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, _cassandra_aggregate, business_id)


def recalculate_business_rating(business_id: str) -> None:
    """Wrapper sincrónico (compatibilidad legacy)."""
    asyncio.run(_recalculate_rating(business_id))
