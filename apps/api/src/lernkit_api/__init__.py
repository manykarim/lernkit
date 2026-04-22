"""Lernkit FastAPI backend — code-execution control plane skeleton.

Phase 0 ships health + version endpoints and a placeholder config. The
code-execution service, sandbox pool, xAPI proxy, and RF runner endpoints
land in Phase 3 per docs/plan/02-phase-plan.md.
"""

from lernkit_api.version import __version__

__all__ = ["__version__"]
