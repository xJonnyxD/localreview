"""
Cassandra connection manager for LocalReview.

Python 3.12+ removed the `asyncore` module that older cassandra-driver
builds depend on.  This module injects a minimal asyncore shim BEFORE
importing cassandra, so the import succeeds.  We then tell the driver to
use AsyncioConnection (the recommended reactor for modern Python).

All FastAPI async endpoints use `cass_exec` / `cass_exec_paged`, which
run the synchronous cassandra-driver calls in a ThreadPoolExecutor so
the asyncio event loop is never blocked.
"""
from __future__ import annotations

# ── asyncore compatibility shim (removed in Python 3.12) ─────────────────────
# Must run BEFORE any cassandra import so asyncorereactor.py can be loaded.
import sys as _sys
import types as _types

if "asyncore" not in _sys.modules:
    _asyncore = _types.ModuleType("asyncore")

    class _Dispatcher:
        """Minimal asyncore.dispatcher stub."""
        _map: dict | None = None

        def __init__(self, sock=None, map=None):
            self._map = map if map is not None else {}
            self._sock = sock

        def set_socket(self, sock, map=None):
            self._sock = sock

        def close(self):
            if self._sock is not None:
                try:
                    self._sock.close()
                except Exception:
                    pass

        def handle_error(self):
            pass

        def handle_close(self):
            pass

    def _loop(timeout=30.0, use_poll=False, map=None, count=None):
        """No-op loop stub — never called because we use AsyncioConnection."""
        pass

    _asyncore.dispatcher = _Dispatcher          # type: ignore[attr-defined]
    _asyncore.loop = _loop                      # type: ignore[attr-defined]
    _asyncore.socket_map = {}                   # type: ignore[attr-defined]
    _sys.modules["asyncore"] = _asyncore

# ── cassandra imports (safe after the shim) ───────────────────────────────────
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from cassandra.cluster import Cluster, Session  # noqa: E402
from cassandra.io.asyncioreactor import AsyncioConnection  # noqa: E402
from cassandra.policies import DCAwareRoundRobinPolicy  # noqa: E402
from cassandra.query import dict_factory, SimpleStatement  # noqa: E402

from app.config import settings  # noqa: E402

logger = logging.getLogger(__name__)

# Global state
_cluster: Cluster | None = None
_session: Session | None = None

# Thread pool for blocking cassandra-driver calls (the driver is thread-safe)
_executor = ThreadPoolExecutor(max_workers=20, thread_name_prefix="cass")

# ─── DDL executed at startup ─────────────────────────────────────────────────

_DDL = [
    f"""
    CREATE KEYSPACE IF NOT EXISTS {settings.CASSANDRA_KEYSPACE}
    WITH replication = {{'class': 'NetworkTopologyStrategy', 'datacenter1': 2}}
    AND durable_writes = true
    """,
    f"USE {settings.CASSANDRA_KEYSPACE}",
    """
    CREATE TABLE IF NOT EXISTS reviews (
        id              uuid,
        business_id     uuid,
        user_id         uuid,
        user_display_name text,
        user_avatar_url text,
        rating          int,
        title           text,
        body            text,
        tags            list<text>,
        photos          list<text>,
        helpful_count   int,
        helpful_by      set<text>,
        status          text,
        owner_resp_text text,
        owner_resp_at   timestamp,
        created_at      timestamp,
        updated_at      timestamp,
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS reviews_by_business (
        business_id     uuid,
        created_at      timestamp,
        id              uuid,
        user_id         uuid,
        user_display_name text,
        user_avatar_url text,
        rating          int,
        title           text,
        body            text,
        tags            list<text>,
        photos          list<text>,
        helpful_count   int,
        helpful_by      set<text>,
        status          text,
        owner_resp_text text,
        owner_resp_at   timestamp,
        updated_at      timestamp,
        PRIMARY KEY ((business_id), created_at, id)
    ) WITH CLUSTERING ORDER BY (created_at DESC, id ASC)
    """,
    """
    CREATE TABLE IF NOT EXISTS reviews_by_user (
        user_id         uuid,
        created_at      timestamp,
        id              uuid,
        business_id     uuid,
        user_display_name text,
        user_avatar_url text,
        rating          int,
        title           text,
        body            text,
        tags            list<text>,
        photos          list<text>,
        helpful_count   int,
        helpful_by      set<text>,
        status          text,
        owner_resp_text text,
        owner_resp_at   timestamp,
        updated_at      timestamp,
        PRIMARY KEY ((user_id), created_at, id)
    ) WITH CLUSTERING ORDER BY (created_at DESC, id ASC)
    """,
    """
    CREATE TABLE IF NOT EXISTS comments (
        id                uuid,
        review_id         uuid,
        business_id       uuid,
        user_id           uuid,
        user_display_name text,
        body              text,
        parent_comment_id uuid,
        created_at        timestamp,
        updated_at        timestamp,
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS comments_by_review (
        review_id         uuid,
        created_at        timestamp,
        id                uuid,
        business_id       uuid,
        user_id           uuid,
        user_display_name text,
        body              text,
        parent_comment_id uuid,
        updated_at        timestamp,
        PRIMARY KEY ((review_id), created_at, id)
    ) WITH CLUSTERING ORDER BY (created_at ASC, id ASC)
    """,
]


# ─── Lifecycle ───────────────────────────────────────────────────────────────

def _blocking_connect() -> tuple[Cluster, Session]:
    """Build Cluster, open session, create schema.  Runs in the thread pool."""
    cluster = Cluster(
        contact_points=settings.CASSANDRA_HOSTS,
        port=settings.CASSANDRA_PORT,
        connection_class=AsyncioConnection,
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc="datacenter1"),
    )
    session = cluster.connect()
    session.row_factory = dict_factory

    for stmt in _DDL:
        session.execute(stmt.strip())

    logger.info("Cassandra schema ready (keyspace=%s)", settings.CASSANDRA_KEYSPACE)
    return cluster, session


async def connect_cassandra() -> None:
    global _cluster, _session
    if _session is not None:
        # Already connected — idempotent (important for tests: avoids re-running DDL)
        return
    loop = asyncio.get_event_loop()
    _cluster, _session = await loop.run_in_executor(_executor, _blocking_connect)
    logger.info("Cassandra connected to %s", settings.CASSANDRA_HOSTS)


async def close_cassandra() -> None:
    global _cluster, _session
    if _cluster is not None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(_executor, _cluster.shutdown)
        _cluster = None
        _session = None
    logger.info("Cassandra disconnected")


# ─── Public helpers ──────────────────────────────────────────────────────────

def get_cassandra() -> Session:
    """Return the live Cassandra session (raises if not connected)."""
    if _session is None:
        raise RuntimeError("Cassandra session not initialised — check lifespan")
    return _session


async def cass_exec(query: str | SimpleStatement, params: tuple | list | None = None) -> Any:
    """Execute *query* in the thread pool and return the ResultSet."""
    session = get_cassandra()
    loop = asyncio.get_event_loop()

    def _run() -> Any:
        return session.execute(query, params or ())

    return await loop.run_in_executor(_executor, _run)


async def cass_exec_paged(
    query: str,
    params: tuple | list | None,
    fetch_size: int = 20,
    paging_state: bytes | None = None,
) -> tuple[list[dict], bytes | None]:
    """
    Execute *query* with Cassandra-native paging.

    Returns (rows, next_paging_state).
    next_paging_state is None when there are no more pages.
    """
    session = get_cassandra()
    loop = asyncio.get_event_loop()

    def _run() -> tuple[list[dict], bytes | None]:
        stmt = SimpleStatement(query, fetch_size=fetch_size)
        result_set = session.execute(stmt, params or (), paging_state=paging_state)
        rows = list(result_set.current_rows)
        return rows, result_set.paging_state

    return await loop.run_in_executor(_executor, _run)
