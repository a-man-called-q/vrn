FROM python:3.12-slim AS builder
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-cache --no-dev

COPY src ./src

FROM python:3.12-slim
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY --from=builder /app /app

EXPOSE {{apiPort}}
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "{{apiPort}}"]
