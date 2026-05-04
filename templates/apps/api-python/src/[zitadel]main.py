import asyncio
from contextlib import asynccontextmanager
from litestar import Litestar, get
from litestar.config.cors import CORSConfig
from redis.asyncio import Redis
from .config import settings
from .db import init_db, close_db
from .stream import setup_consumer
from .routes.webhook import webhook_router


@asynccontextmanager
async def lifespan(app: Litestar):
    redis: Redis = Redis.from_url(settings.redis_url, decode_responses=True)
    app.state.redis = redis
    consumer_task = asyncio.create_task(setup_consumer(redis))
    await init_db()
    try:
        yield
    finally:
        consumer_task.cancel()
        await redis.aclose()
        await close_db()


@get("/health")
async def health() -> dict:
    return {"status": "ok"}


@get("/")
async def index() -> str:
    return "Hello from {{titleCase name}} API"


app = Litestar(
    route_handlers=[health, index, webhook_router],
    cors_config=CORSConfig(
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
    ),
    lifespan=[lifespan],
)
