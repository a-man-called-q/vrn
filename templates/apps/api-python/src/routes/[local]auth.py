from dataclasses import dataclass
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from litestar import Router, get, post
from litestar.connection import Request
from litestar.exceptions import HTTPException
from litestar.status_codes import HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED
from ..models.user import User
from ..auth import create_token, verify_token

_ph = PasswordHasher()


@dataclass
class RegisterPayload:
    email: str
    password: str
    name: str | None = None


@dataclass
class LoginPayload:
    email: str
    password: str


@post("/auth/register")
async def register(data: RegisterPayload) -> dict:
    if await User.filter(email=data.email).exists():
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = await User.create(
        email=data.email,
        name=data.name,
        password_hash=_ph.hash(data.password),
    )
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}


@post("/auth/login")
async def login(data: LoginPayload) -> dict:
    user = await User.filter(email=data.email).first()
    if not user:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    try:
        _ph.verify(user.password_hash, data.password)
    except VerifyMismatchError:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}


@get("/auth/me")
async def me(request: Request) -> dict:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        claims = verify_token(auth_header[7:])
        user = await User.get(id=int(claims["sub"]))
        return {"id": user.id, "email": user.email, "name": user.name}
    except Exception:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid token")


auth_router = Router(path="/", route_handlers=[register, login, me])
