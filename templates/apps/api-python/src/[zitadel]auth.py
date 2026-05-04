from functools import lru_cache
import httpx
from authlib.jose import jwt, JsonWebKey
from .config import settings


@lru_cache(maxsize=1)
def _jwks_uri() -> str:
    resp = httpx.get(f"{settings.zitadel_domain}/.well-known/openid-configuration")
    resp.raise_for_status()
    return resp.json()["jwks_uri"]


async def verify_token(token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(_jwks_uri())
        resp.raise_for_status()
        jwks = resp.json()

    key_set = JsonWebKey.import_key_set(jwks)
    claims = jwt.decode(token, key_set)
    claims.validate()
    return dict(claims)
