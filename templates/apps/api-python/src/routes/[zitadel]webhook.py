import hashlib
import hmac
import json
from dataclasses import dataclass
from litestar import Router, post
from litestar.connection import Request
from litestar.exceptions import NotAuthorizedException
from redis.asyncio import Redis
from ..config import settings


@dataclass
class ZitadelWebhookPayload:
    zitadel_id: str
    email: str
    name: str | None = None


@post("/webhooks/zitadel")
async def zitadel_webhook(request: Request, data: ZitadelWebhookPayload) -> dict:
    body = await request.body()
    signature = request.headers.get("x-zitadel-signature", "")
    expected = hmac.new(
        settings.zitadel_webhook_secret.encode(), body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise NotAuthorizedException()

    redis: Redis = request.app.state.redis
    await redis.xadd(
        "str:zitadel:events",
        {
            "type": "user.registered",
            "payload": json.dumps({
                "zitadel_id": data.zitadel_id,
                "email": data.email,
                "name": data.name,
            }),
        },
    )
    return {"success": True, "message": "Identity event broadcasted"}


webhook_router = Router(path="/", route_handlers=[zitadel_webhook])
