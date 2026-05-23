from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Cassandra (única base de datos)
    CASSANDRA_HOSTS: list[str] = ["localhost"]
    CASSANDRA_KEYSPACE: str = "localreview"
    CASSANDRA_PORT: int = 9042

    # JWT
    JWT_SECRET_KEY: str = "change-this-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "LocalReview"
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    UPLOAD_DIR: str = "./uploads"

    model_config = {"env_file": "../.env", "extra": "ignore"}


settings = Settings()
