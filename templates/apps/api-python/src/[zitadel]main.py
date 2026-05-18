import asyncio
from contextlib import asynccontextmanager
from litestar import Litestar, get
from litestar.config.cors import CORSConfig
from litestar.middleware.rate_limit import RateLimitConfig
from redis.asyncio import Redis
from .config import settings
from .db import init_db, close_db
from .stream import setup_consumer
from ._vrn.handlers import vrn_handlers


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


rate_limit = RateLimitConfig(
    rate_limit=("minute", 60),
    exclude=["/health", "/"],
)

app = Litestar(
    route_handlers=[health, index, *vrn_handlers],
    cors_config=CORSConfig(
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
    ),
    middleware=[rate_limit.middleware],
    lifespan=[lifespan],
)
