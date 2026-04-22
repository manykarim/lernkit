# FastAPI backend image. Phase 0: runs the /health + /version endpoints.
#
# Uses uv (https://docs.astral.sh/uv/) for fast, reproducible Python installs.
# Multi-stage: builder installs deps into a venv, runtime copies the venv only.

FROM python:3.13-slim AS builder

# uv installer
COPY --from=ghcr.io/astral-sh/uv:0.5.10 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

# Install deps without the project first (better layer caching).
COPY apps/api/pyproject.toml /app/pyproject.toml
RUN --mount=type=cache,target=/root/.cache/uv \
    uv venv /app/.venv && \
    uv pip install --python /app/.venv/bin/python \
        "fastapi>=0.115.0,<0.116" \
        "uvicorn[standard]>=0.34.0,<0.35" \
        "pydantic>=2.10.0,<3.0" \
        "pydantic-settings>=2.7.0,<3.0" \
        "structlog>=24.4.0,<25.0"

# Copy project source
COPY apps/api/src /app/src
COPY apps/api/pyproject.toml /app/pyproject.toml


# --- runtime stage ---
FROM python:3.13-slim AS runtime

# Create non-root user
RUN groupadd --system --gid 1001 lernkit && \
    useradd --system --uid 1001 --gid lernkit --home-dir /app --shell /bin/bash lernkit

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app/src"

WORKDIR /app

COPY --from=builder --chown=lernkit:lernkit /app /app

USER lernkit

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=2).read()" || exit 1

CMD ["uvicorn", "lernkit_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
