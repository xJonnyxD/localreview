from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_mongodb() -> None:
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB]


async def close_mongodb() -> None:
    global client
    if client:
        client.close()


def get_mongodb() -> AsyncIOMotorDatabase:
    return db
