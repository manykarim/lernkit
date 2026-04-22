# Lernkit

> Code-first authoring framework for technical training. Produces conformant SCORM 1.2 / SCORM 2004 4th Ed / cmi5 / xAPI packages from MDX sources, with runnable code (Python via Pyodide, JavaScript via Sandpack, Robot Framework via rf-mcp) as a first-class lesson primitive.

Lernkit is an **OSS single-tenant framework** (per [ADR 0022](./docs/adr/0022-oss-single-tenant-framework-scope.md)). No hosted SaaS, no multi-tenant, no marketplace — customers self-host on a single Coolify + Hetzner box (per [ADR 0018](./docs/adr/0018-coolify-on-hetzner-for-self-hosting-default.md)).

## Status

**Phase 0 complete. Phase 1 in progress — SCORM 1.2 packager landed.**

- `pnpm build:scorm12` now produces a structurally-conformant SCORM 1.2 zip from the sample course.
- `LernkitScorm12Adapter` implements the unified Tracker interface (ADR 0004) against the bundled in-browser runtime.
- Full Phase 1 completion (real LMS round-trips, Tier 1 widget library, xAPI stub) is ongoing — see [`docs/plan/02-phase-plan.md`](./docs/plan/02-phase-plan.md).

## Repository layout

```
apps/
  docs/        Astro 5 + Starlight site + sample course (MDX)
  api/         FastAPI backend — code-execution control plane skeleton
packages/
  tracker/     Unified Tracker interface (ADR 0004) + NoopAdapter + LernkitScorm12Adapter
  packagers/   SCORM 1.2 packager (Phase 1); cmi5 / 2004 / xAPI follow (ADR 0015)
  config/      Shared tsconfig and lint presets
infra/
  docker/      Dockerfiles for the app + api
  coolify/     Coolify deployment recipe (ADR 0018)
  docker-compose.yml
docs/          ADRs, DDD, implementation plan, original research
.github/       CI workflows, PR template, issue templates, dependabot
```

## Quick start (local dev)

```bash
# 1. Install pnpm via corepack (ships with Node 22+)
corepack enable pnpm

# 2. Install JS dependencies
pnpm install

# 3. Install Python dependencies (uv — https://docs.astral.sh/uv/)
cd apps/api && uv sync && cd ../..

# 4. Bring up local stack (Postgres, Redis, LRS)
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d

# 5. Start the dev servers (Astro + FastAPI) in parallel
pnpm dev
```

- Astro site → http://localhost:4321
- FastAPI `/health` → http://localhost:8000/health
- FastAPI `/version` → http://localhost:8000/version
- GlitchTip UI → http://localhost:8001 (Phase 1+)
- LRS → http://localhost:8080 (Phase 3+)

## Validation

```bash
pnpm lint           # Biome
pnpm typecheck      # tsc --noEmit across packages
pnpm test           # Vitest (packages) + Pytest (api, via make)
pnpm build          # turbo build (Astro + TS)
pnpm build:scorm12  # build Astro + produce SCORM 1.2 zip in apps/docs/dist-packages/
```

After `pnpm build:scorm12`, inspect the zip:

```bash
ZIP=apps/docs/dist-packages/scorm12/lernkit-sample-course-0.0.0-scorm12.zip
unzip -l "$ZIP"                          # list entries
unzip -p "$ZIP" imsmanifest.xml | head   # manifest head
unzip -tq "$ZIP" && echo "zip OK"        # integrity
```

## Documentation

- [`docs/adr/`](./docs/adr/) — Architecture Decision Records (MADR 3.0).
- [`docs/ddd/`](./docs/ddd/) — Domain model: bounded contexts, ubiquitous language, ACLs.
- [`docs/plan/`](./docs/plan/) — Implementation plan: phases, risks, test strategy, CI/CD.
- [`docs/plan/PRODUCT-SHAPE.md`](./docs/plan/PRODUCT-SHAPE.md) — One-page anchor for what Lernkit is and is not.
- [`docs/research/`](./docs/research/) — The original research document that informed every ADR.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Contributions via PR with DCO sign-off per [ADR 0014](./docs/adr/0014-mit-license-for-framework-core.md).

## License

[MIT](./LICENSE).

## Security

See [`SECURITY.md`](./SECURITY.md). Credit-only disclosure program per [ADR 0022](./docs/adr/0022-oss-single-tenant-framework-scope.md).
