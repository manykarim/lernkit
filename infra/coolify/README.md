# Coolify deployment recipe

> Lernkit's default production substrate is a single Coolify-managed Hetzner box — see [ADR 0018](../../docs/adr/0018-coolify-on-hetzner-for-self-hosting-default.md).

## What this directory contains

- [`lernkit.yml`](./lernkit.yml) — Docker Compose manifest Coolify consumes to spin up the full Lernkit stack (docs site, API, Postgres, Redis, GlitchTip).
- [`.env.example`](./.env.example) — the environment variables Coolify prompts for at deploy time.

## Prerequisites

- A Hetzner box (AX41 recommended for production; CX41 fine for staging) with Docker installed.
- [Coolify v4](https://coolify.io/) installed on that box.
- A DNS record pointing at the box — Coolify terminates TLS via Traefik + Let's Encrypt.

## Deploy

1. In Coolify, create a new **Project** named `lernkit`.
2. Add an **Environment** (`production`, `staging`).
3. Add a **Resource** → **Docker Compose** and point it at this repo's `infra/coolify/lernkit.yml`.
4. Fill in the env vars (see `.env.example`).
5. Click **Deploy**.

Coolify will build the images via `infra/docker/*.Dockerfile`, create the services, wire Traefik for TLS, and expose:

- `docs.your-domain.tld` → Astro static site
- `api.your-domain.tld` → FastAPI backend
- `errors.your-domain.tld` → GlitchTip UI

## Updating

Coolify watches the repo's default branch (configure in the UI). On merge to `main`, Coolify rebuilds and rolls the affected services.

## Escape hatch

If Coolify's cadence ever degrades (tracked as R-23 + OQ-X-8 per the plan), the same stack can be stood up with vanilla Docker Compose on the same box:

```bash
docker compose -f infra/coolify/lernkit.yml up -d
```

and wire TLS via Traefik or Caddy by hand. See the ADR 0018 fallback note.
