from datetime import datetime, timedelta, timezone
from authlib.jose import jwt
from .config import settings

_ALGORITHM = "HS256"
_EXPIRES_HOURS = 24


def create_token(user_id: int, email: str) -> str:
    header = {"alg": _ALGORITHM}
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=_EXPIRES_HOURS),
    }
    return jwt.encode(header, payload, settings.secret_key).decode()


def verify_token(token: str) -> dict:
    claims = jwt.decode(token, settings.secret_key)
    claims.validate()
    return dict(claims)
