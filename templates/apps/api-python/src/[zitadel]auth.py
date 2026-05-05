from functools import lru_cache
import time
import httpx
from authlib.jose import jwt, JsonWebKey
from .config import settings

_jwks_cache = {"keys": None, "fetched_at": 0}

@lru_cache(maxsize=1)
def _jwks_uri() -> str:
    resp = httpx.get(f"{settings.zitadel_domain}/.well-known/openid-configuration")
    resp.raise_for_status()
    return resp.json()["jwks_uri"]

async def _get_jwks() -> dict:
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"] < 300):
        return _jwks_cache["keys"]

    async with httpx.AsyncClient() as client:
        resp = await client.get(_jwks_uri())
        resp.raise_for_status()
        jwks = resp.json()
        
    _jwks_cache["keys"] = jwks
    _jwks_cache["fetched_at"] = now
    return jwks

async def verify_token(token: str) -> dict:
    jwks = await _get_jwks()
    key_set = JsonWebKey.import_key_set(jwks)
    claims = jwt.decode(token, key_set)
    claims.validate()
    return dict(claims)
