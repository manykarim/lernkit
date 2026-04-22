---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0018 — Run the default self-hosted deployment on Coolify + Hetzner dedicated hardware

## Context and Problem Statement

Lernkit's deployment targets range from a solo trainer running their own course site to an engineering org running an internal training portal. Per
ADR 0022 the product is scoped to single-tenant OSS self-host — there is no hosted SaaS tier, no multi-tenant substrate to design toward. Kubernetes is
overkill for the shapes we do support. A public cloud PaaS (Fly.io, Render, Railway) is easy but has recurring costs that scale with usage and often
restricts the Docker-runtime features the sandbox needs. We need a deployment target that:

- runs the full stack (Astro static + FastAPI + runner pool + Postgres + Redis + LRS + the co-hosted services listed in ADR 0021),
- is cheap for small-to-medium training orgs,
- supports Docker + gVisor (ADR 0008),
- does not require K8s operator expertise,
- can be reproduced by any customer who forks the repo.

## Decision Drivers

- **Cost predictability.** Per-execution code running on public cloud becomes expensive; dedicated hardware flattens cost curves.
- **Docker + gVisor compatibility.** Must not require nested virtualization restrictions (a blocker on many shared VM providers).
- **Operator ergonomics.** One-box-gets-you-going experience; minimal YAML.
- **Self-host-first posture (ADR 0021).** The substrate has to host every service the project itself runs, not only application tier.
- **Data locality.** European operators often require EU-hosted data; Hetzner is EU-native.

## Considered Options

- **A:** Docker Compose for dev; Coolify on Hetzner dedicated (CX / AX range) for single-tenant prod; a raw Docker Compose + Traefik fallback kept as the escape hatch if Coolify's cadence becomes a problem.
- **B:** Kubernetes (k3s / k0s) on Hetzner from day one.
- **C:** Public cloud PaaS — Fly.io, Render, or Railway.
- **D:** AWS ECS / Fargate.
- **E:** Bare-metal Docker Swarm.

## Decision Outcome

Chosen option: **A — Docker Compose for dev; Coolify on a Hetzner dedicated server (CX41 class VPS up to AX41 dedicated, depending on scale) as the
production default; a vanilla Docker Compose + Traefik fallback documented as the escape hatch if Coolify cadence degrades.**

### The two tiers

| Tier | Target use | Infra | Orchestration |
|------|------------|-------|---------------|
| Dev | Local engineering | Docker Compose | Compose file in repo |
| Prod single-tenant (only tier Lernkit supports) | 1–5,000 MAU, on-prem or customer-hosted | Hetzner CX (VPS) or AX (dedicated) | Coolify (primary); vanilla Docker Compose + Traefik (escape hatch) |

A multi-tenant / hosted-SaaS tier is explicitly out of scope per ADR 0022 and does not appear in this table. Customers who need multi-tenant isolation
run their own deployment of Lernkit per tenant — the single-tenant substrate is designed to be cheap enough that horizontal replication per customer
is practical.

### Why Hetzner

- **CX series** (cloud VPS): CX21–CX51; Linux, KVM, runs Docker + gVisor fine; EU datacenters (Falkenstein, Nuremberg, Helsinki); ~€5–€40/month.
- **AX series** (dedicated): AX41, AX52, AX102; real CPU, real RAM, no noisy neighbors; ideal for the runner pool in ADR 0008. ~€40–€150/month.
- **Network egress** is effectively flat-priced compared to AWS/GCP — relevant when serving Pyodide wasm blobs and video.
- **EU data residency** by default — meets GDPR compliance for most European customers without extra legwork.
- **Support** is plain — no byzantine billing surprises.

### Why Coolify (v4)

- **Open source** (Apache 2.0) — aligns with ADR 0014.
- **PaaS-on-your-own-hardware.** Git-push deploy, one-click services (Postgres, Redis), reverse proxy (Traefik), automatic TLS via Let's Encrypt.
- **Docker-native.** Runs gVisor containers correctly.
- **UI + API** — automating deployment lifecycle from CI is scriptable against Coolify's API.
- **Low operator burden** — a small team can run it without a dedicated SRE.

### Deployment shape (single-tenant default)

```
Hetzner AX41 (dedicated) or CX41 (VPS)
├── Coolify
│   ├── Astro static site (served by Traefik or Caddy)
│   ├── FastAPI service (2 replicas behind Traefik)
│   ├── Runner pool (gVisor containers, per-language warm pool)
│   ├── Postgres 16 (managed via Coolify service)
│   ├── Redis 7 (managed via Coolify service)
│   └── Yet Analytics SQL LRS (ADR 0013)
└── Backups → Hetzner Storage Box (weekly full + daily incremental)
```

For higher-load single-tenant deployments, split the runner pool onto a **second** Hetzner host (CX / AX) so learner code runs physically separate from the
control plane and the LRS.

### Services co-hosted on the Coolify box

Self-host-first 2026-04-21 per ADR 0021. The single Coolify box is the substrate for the full team-facing and customer-facing service set:

- **Application** — Astro static site + Astro API routes + Starlight docs (one deployable).
- **FastAPI backend** — code-execution control plane.
- **Runner pool** — Docker + gVisor (ADR 0008); gVisor `runsc` runtime.
- **Yet Analytics SQL LRS** — ADR 0013.
- **Grafana + Prometheus + Loki + Tempo** — observability stack (metrics, logs, traces).
- **GlitchTip** — error tracking (self-host-first 2026-04-21 per ADR 0021).
- **Mattermost** — team chat (self-host-first 2026-04-21 per ADR 0021).
- **Verdaccio** — internal npm cache (self-host-first 2026-04-21 per ADR 0021).
- **Uptime Kuma** — uptime monitoring.
- **Postgres** — shared instance; logical databases per service: `app`, `lrs`, `glitchtip`, `mattermost`, `grafana`.
- **Redis** — shared instance; keyspaces per service: `app:*`, `runner:*`, `rate-limit:*`.

The shared Postgres and Redis are the "reuse before add" rule from ADR 0021: new services that need a relational store or a cache pick up a logical
database or a keyspace on the existing instance before a second instance is considered.

### Box sizing

Scope narrowed 2026-04-21 per ADR 0022. For the combined stack at small-to-medium scale, the recommended target is a **Hetzner AX41 dedicated** (or
equivalent — 6-core Ryzen, 64 GB RAM, 2×512 GB NVMe). Smaller cloud instances (CX41 class — ~8 vCPU / 16 GB RAM) are adequate for development and
staging, but the code-runner pool benefits materially from bare-metal CPU for gVisor performance — the difference is most visible at p99 under load,
and at `runsc` syscall-heavy paths that are sensitive to hypervisor overhead. Treat the CX41 as a dev/staging target and the AX41 as the production
default for the co-hosted set above.

### When we split this box

Self-host-first 2026-04-21 per ADR 0021. The single-box posture is the default, not a permanent constraint. Triggers that force a second box:

- **Code-runner pool sustained CPU > 70% for 7 consecutive days** — move the runner pool to its own dedicated box (the pre-existing "split runner pool"
  pattern above, now with a concrete trigger).
- **LRS database > 100 GB or query latency p95 > 500 ms** — move the LRS and its Postgres logical DB to a dedicated box.
- **Mattermost file storage > 50 GB** — consider mounting a Hetzner Storage Box rather than splitting hosts.
- **Any compliance requirement mandating multi-region** — out of scope per ADR 0022; customers with that need run their own deployment. The project
  itself does not operate a multi-region substrate.

### Escape hatch if Coolify cadence degrades

Scope narrowed 2026-04-21 per ADR 0022 — there is no multi-tenant trigger because multi-tenant is out of scope. The remaining operational risk is
Coolify's own maintenance cadence (tracked as risk R-23 and OQ-X-8). The documented fallback is **vanilla Docker Compose + Traefik + a small set of
systemd units** running the same service set on the same Hetzner host. A tested Compose template lives in the ops repo; the quarterly restore drill
exercises it against a clean CX21 so it is not allowed to bit-rot.

Kubernetes is not on the roadmap. If a future ADR reopens that question, it will supersede this one explicitly.

### Consequences

- **Cost, good:** running the full stack on a single AX41 plus a Storage Box is ~€100/month; adding a second box for the runner pool doubles it. Within the
  $500–700/month budget from research §4.6.
- **Portability, good:** Hetzner + Coolify is Docker-native — customers who prefer a different host can swap providers without code changes.
- **Portability, good:** Docker Compose dev environment mirrors the production topology, reducing dev/prod drift.
- **Security, good:** dedicated hardware eliminates noisy-neighbor concerns for gVisor runners; EU data residency is a regulatory win.
- **Security, note:** Coolify runs as root-equivalent on the host; lock it down behind SSH + firewall; rotate Coolify's admin credentials.
- **Performance, good:** dedicated hardware offers stable latency for interactive code execution.
- **Performance, bad (ceiling):** a single-node deployment has a hard vertical ceiling; the "When we split this box" triggers above are when we horizontally split the stack across additional Hetzner hosts.
- **Clarity, good:** one deployment target for the entire OSS community; matches customers' self-hosting expectations.
- **Clarity, bad:** Coolify itself is a moving target — stay on current stable releases; pin the Coolify version in operator runbooks.

## Pros and Cons of the Options

### A — Docker Compose dev + Coolify/Hetzner prod + K8s on trigger — chosen

- Good: pragmatic tiering; right complexity per scale.
- Good: Hetzner EU residency + flat pricing.
- Good: Coolify's OSS license fits our overall license posture.
- Bad: Coolify maintenance cadence is meaningful to watch — have an escape hatch to raw Docker Compose + Traefik if needed.

### B — K8s from day one

- Bad: operator overhead unjustified at single-tenant scale.
- Bad: bikeshedding on Helm charts, ingress controllers, and observability for a team of 2–3 engineers.

### C — Public cloud PaaS (Fly.io, Render, Railway)

- Good: zero host ops.
- Bad: runner pool economics at 40K executions/month pushes us into the "cheaper on dedicated hardware" regime quickly.
- Bad: some PaaS restrict Docker runtime features (custom runtimes like runsc) — blocker for gVisor.

### D — AWS ECS / Fargate

- Bad: cost. A Fargate-backed runner pool at our execution volume is multiples of a Hetzner AX41.
- Bad: per-execution cold-starts are Fargate's weakness; warm-pool is non-trivial.

### E — Docker Swarm

- Bad: Swarm is in maintenance mode; community momentum is firmly on K8s or PaaS-like tools (Coolify, Portainer).

## Backup and disaster recovery

- **Postgres:** nightly `pg_dump` to Hetzner Storage Box; retention 14 days nightly + 12 months monthly.
- **Content:** the source MDX is Git-backed — disaster recovery is `git clone`.
- **Runner images:** rebuild from source on demand; no stateful data in runners.
- **LRS:** separate Postgres schema; nightly dump included in the same job.
- **Config:** Coolify's configuration exported weekly; encrypted secrets in a password manager (not in repo).
- **Restore drill** run quarterly; runbook lives in the ops repo.

## Validation

- **Smoke deploy:** a clean Hetzner CX21 VPS goes from zero to a working framework deployment in <30 minutes following the runbook.
- **Migration drill:** restoring from the nightly backup to a fresh host reproduces the production state within 60 minutes.
- **Resource headroom:** at 1,000 MAU steady-state, CPU and RAM usage stay under 60% average on the AX41 target; above that, plan to split the runner pool.
- **gVisor sanity:** a container deliberately tries to write to `/sys`; the write fails; no kernel panic; no host impact.

## More Information

- Research §7 "Tool stack proposal" — self-hosting row.
- Research §4.6 cost table.
- Hetzner: https://www.hetzner.com/.
- Coolify: https://coolify.io/.
- Related ADRs: 0008 (server-side execution hosted here), 0013 (LRS hosted here), 0020 (deferrals — note portions superseded by 0022).
- ADR 0021 — Self-host-first infrastructure principle. Governs the co-hosted service list above and the exception policy for SaaS dependencies.
- ADR 0022 — OSS single-tenant framework scope. Constrains the "split this box" triggers: multi-region is out of scope; single-tenant single-box is the
  product's operational shape.
- Open question: do we provide a Terraform module / Ansible playbook for a Hetzner + Coolify bootstrap? Deferred to Phase 1 — helpful-but-not-critical.
