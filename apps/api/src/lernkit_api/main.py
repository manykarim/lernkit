"""FastAPI application entrypoint.

Phase 0 only exposes health, readiness, and version. The full route surface
(execution, xAPI proxy, RF runner) is introduced in Phase 3.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from lernkit_api.config import settings
from lernkit_api.health import router as health_router
from lernkit_api.version import __version__

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info("lernkit_api.startup", env=settings.env, version=__version__)
    yield
    logger.info("lernkit_api.shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lernkit API",
        version=__version__,
        description="Code-execution control plane for Lernkit (Phase 0 skeleton).",
        lifespan=lifespan,
    )
    app.include_router(health_router)
    return app


app = create_app()
