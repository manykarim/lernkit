# lernkit-api

FastAPI backend for Lernkit. Phase 0 ships health + version + readiness routes only. The full route surface (code execution, xAPI proxy, Robot Framework runner) lands in Phase 3.

## Local dev

```bash
# From the repo root, or this directory
uv sync --extra dev
uv run uvicorn lernkit_api.main:app --reload --host 0.0.0.0 --port 8000
```

- <http://localhost:8000/health>
- <http://localhost:8000/ready>
- <http://localhost:8000/version>
- <http://localhost:8000/docs> (auto-generated OpenAPI UI)

## Tests

```bash
uv run pytest
uv run ruff check
uv run ruff format --check .
uv run mypy src
```
