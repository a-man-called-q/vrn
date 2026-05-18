from contextlib import asynccontextmanager
from litestar import Litestar, get
from litestar.config.cors import CORSConfig
from litestar.middleware.rate_limit import RateLimitConfig
from .config import settings
from .db import init_db, close_db
from ._vrn.handlers import vrn_handlers


@asynccontextmanager
async def lifespan(app: Litestar):
    await init_db()
    try:
        yield
    finally:
        await close_db()


@get("/health")
async def health() -> dict:
    return {"status": "ok"}


@get("/")
async def index() -> str:
    return "Hello from {{titleCase name}} API"


rate_limit = RateLimitConfig(
    rate_limit=("minute", 30),
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
