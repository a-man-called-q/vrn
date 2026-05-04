from contextlib import asynccontextmanager
from litestar import Litestar, get
from litestar.config.cors import CORSConfig
from .config import settings
from .db import init_db, close_db
from .routes.auth import auth_router


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


app = Litestar(
    route_handlers=[health, index, auth_router],
    cors_config=CORSConfig(
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
    ),
    lifespan=[lifespan],
)
