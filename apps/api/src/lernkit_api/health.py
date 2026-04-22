"""Health and readiness routes.

These are split:
- `/health` is a liveness probe — always cheap, always responds 200 if the process is up.
- `/ready` is a readiness probe — returns 503 if the process has not finished init.

Dependencies that could fail (DB, Redis, LRS) land in `/ready` in Phase 3 when
those dependencies are actually wired.
"""

from __future__ import annotations

from fastapi import APIRouter, status
from pydantic import BaseModel

from lernkit_api.version import BUILD_SHA, BUILD_TIMESTAMP, __version__

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class ReadinessResponse(BaseModel):
    ready: bool
    checks: dict[str, str]


class VersionResponse(BaseModel):
    version: str
    build_sha: str
    build_timestamp: str


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health() -> HealthResponse:
    """Liveness probe. Returns 200 if the process is up."""
    return HealthResponse(status="ok", service="lernkit-api", version=__version__)


@router.get("/ready", response_model=ReadinessResponse)
async def ready() -> ReadinessResponse:
    """Readiness probe. Phase 0: trivially ready. Phase 3: checks Postgres, Redis, LRS."""
    return ReadinessResponse(ready=True, checks={"self": "ok"})


@router.get("/version", response_model=VersionResponse)
async def version() -> VersionResponse:
    return VersionResponse(version=__version__, build_sha=BUILD_SHA, build_timestamp=BUILD_TIMESTAMP)
