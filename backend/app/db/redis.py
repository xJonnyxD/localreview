from redis.asyncio import Redis

from app.config import settings

redis_client: Redis = None


async def connect_redis() -> None:
    global redis_client
    redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)


async def close_redis() -> None:
    global redis_client
    if redis_client:
        await redis_client.close()


def get_redis() -> Redis:
    return redis_client
