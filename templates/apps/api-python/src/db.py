from tortoise import Tortoise
from .config import settings

TORTOISE_ORM = {
    "connections": {"default": settings.database_url},
    "apps": {
        "models": {
            "models": ["src.models.user", "aerich.models"],
            "default_connection": "default",
        }
    },
}


async def init_db() -> None:
    await Tortoise.init(config=TORTOISE_ORM)


async def close_db() -> None:
    await Tortoise.close_connections()
