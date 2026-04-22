---
status: accepted
date: 2026-04-21
deciders: core team
consulted: Many
informed: future engineering team
---
# 0021 — Self-host every infrastructure dependency that is practical to self-host

## Context and Problem Statement

Lernkit is shipped as an OSS framework that customers deploy into their own environment (per ADR 0018 on Coolify + Hetzner, and ADR 0022 scoping the project
to single-tenant OSS). Our own development, staging, and production infrastructure should match that posture. Every SaaS dependency we adopt internally
risks a mismatch between the operational model we preach and the one we live by, and introduces a supply-chain, data-residency, or account-lockout
surface we do not control.

This ADR sets the decision rule: for any new infrastructure need (error tracking, chat, CI, package registry, search, observability, issue tracking,
container registry, LRS, etc.) the default is the self-hosted option co-resident on the project's Coolify box, and any SaaS adoption is a documented
exception.

## Decision Drivers

- **Eat our own dog food.** Customers will self-host the framework and its optional services. We should operate the same way so we feel the same pain.
- **Supply-chain minimization.** Each SaaS vendor is a distinct account, credential, DPA, billing relationship, and potential incident.
- **Data residency.** The LRS (ADR 0013) is self-hosted by design because xAPI statements contain learner identifiers. The rest of our observability
  surface (error traces, stdout/stderr from sandboxed code) can contain equivalent PII and deserves the same treatment.
- **Cost.** At a 3-engineer team size, five SaaS subscriptions at $5–25/user/month each approaches the unit economics of a small Hetzner box that
  can host all of them.
- **Budget discipline.** SaaS creep is the canonical way projects accrete monthly cost without gaining capability. A self-host-first default forces every
  SaaS choice to pass an explicit justification.

## Considered Options

- **A:** Self-host-first as a written principle, SaaS adoption permitted only via a documented exception with a named reason.
- **B:** Case-by-case with no default — evaluate every tool on merit independently.
- **C:** SaaS-first for productivity tools, self-host-first for customer-adjacent infrastructure only.

## Decision Outcome

Chosen option: **A — self-host-first by default; SaaS requires an exception.**

### Policy

A new infrastructure dependency is adopted in the following order of preference:

1. **Already in the Coolify stack** — does an existing service cover the need? If yes, reuse it. (Example: reuse Postgres across services rather than
   running a second one.)
2. **Self-host the OSS project** — add to the Coolify stack, follow the "shared infra" pattern in [`docs/plan/09-dependency-governance.md`](../plan/09-dependency-governance.md).
3. **Self-host on a separate Hetzner instance** — only if the service has incompatible resource profile (e.g. CPU-intensive, memory-hungry, or
   security-sensitive workloads that should not share a host with application servers).
4. **SaaS with exception** — allowed only when all three above are infeasible. Requires an explicit ADR paragraph naming the reason, the cost, and the
   migration path if we want to reclaim it.

Every SaaS adoption is added to [`docs/plan/09-dependency-governance.md`](../plan/09-dependency-governance.md) with its DPA status, data-residency region,
and annual cost.

### Exceptions we are accepting up front

- **GitHub** (source hosting, issue tracking, CI runners, container registry, Discussions, Releases, Advisory). Contributors already have GitHub
  accounts; the network effect outweighs the self-host benefit. **Migration path if needed:** Forgejo + Woodpecker CI + a Gitea container registry on
  Hetzner.
- **npm public registry.** Public discoverability of `@lernkit/*` packages requires the real npm registry. We mitigate with **Verdaccio self-hosted** as
  an internal caching proxy for the monorepo build, so our CI and local dev do not depend on npm availability.
- **Trademark + legal services.** One-off engagements, not infrastructure.

### Service-by-service posture

| Service | Choice | Location |
|---|---|---|
| Error tracking | **GlitchTip self-hosted** (~3 containers, Sentry SDK-compatible) | Coolify box |
| Metrics / traces / logs | **OpenTelemetry + Grafana + Prometheus + Loki + Tempo self-hosted** (already in the plan) | Coolify box |
| Chat | **Mattermost self-hosted** | Coolify box |
| Community forum | GitHub Discussions P0–P2; **Discourse self-hosted** at P3 | Coolify box (Discourse, when added) |
| Learning Record Store | **Yet Analytics SQL LRS self-hosted** (ADR 0013) | Coolify box |
| CMS | **Keystatic** (ADR 0012) — in-repo, no separate service | In-repo |
| Search | **Pagefind** (ADR 0002) — static, bakes into the site and into SCORM packages | Build-time |
| Source + issues + CI | **GitHub** (exception above) | SaaS |
| Internal package cache | **Verdaccio** | Coolify box |
| Container registry | **GHCR** for public images (`ghcr.io/manykarim/rf-mcp` already exists) | SaaS |
| Status / uptime | **Uptime Kuma self-hosted** | Coolify box |
| Secrets | **SOPS + age** in-repo, encrypted; no Vault until we need cross-team rotation | In-repo |

The above is the **current state** of the policy; new services added later must be filed either as "self-hosted, added to the Coolify stack" or as a
new row with an exception justification.

### CI runners sub-policy

Default: **GitHub-hosted runners**. They are free for public repos and cheap for private, they have no self-host security surface, and they align with
the GitHub exception above. We adopt **self-hosted runners only when**:

- cost materially exceeds budget (unlikely at project size), or
- a specific job needs bare-metal access (e.g. running real gVisor + KVM benchmarks the hosted runners cannot provide), or
- an untrusted-code surface needs isolation GitHub's shared hosted runners cannot guarantee (the sandbox runner's own tests).

When we do adopt self-hosted runners, they run as **ephemeral, single-use** containers behind a job-level allow-list; they do not run on PRs from
untrusted forks. This is standard GHA hardening.

### Consequences

- **Security, good:** every service we add is on infrastructure we control; credentials do not leave our network.
- **Cost, good:** the marginal Hetzner-RAM cost of adding another container is small relative to a per-user SaaS subscription at 3+ seats.
- **Clarity, good:** the single-box operational story is the same story our users will read.
- **Ops, bad:** every self-hosted service has upgrade, backup, and incident cost. We accept this and treat Coolify's built-in backup as the baseline.
- **DX, mixed:** some self-hosted UIs lag their SaaS siblings (Mattermost mobile vs Slack). This is a small, recurring tax.
- **Portability, good:** the production substrate is documented and reproducible, which is the same promise we make to users.

## Pros and Cons of the Options

### A — self-host-first with explicit exceptions — chosen

- Good: dogfoods the customer experience.
- Good: predictable cost at a single substrate.
- Good: documented exception path (GitHub, npm) so we are honest rather than pure.
- Bad: more operational load than SaaS.
- Bad: each self-host has to be kept patched; Coolify automates most of this but not all.

### B — case-by-case without a default

- Good: maximum flexibility.
- Bad: reopens the decision every time; over a project's lifetime SaaS creep wins by default when no principle resists it.

### C — SaaS-first for productivity tools only

- Good: best DX for team-facing tooling.
- Bad: splits the substrate story (customer-facing we self-host, team-facing we do not) which is exactly the consistency we want to avoid.

## Validation

- **Self-host adoption check in CI.** The `docs/plan/09-dependency-governance.md` table is parsed by a doc-linting job; any service in the project
  infrastructure not listed as either self-hosted or an accepted exception fails the build.
- **Quarterly review.** At every quarterly arch review, walk the service-by-service table. Any newly-added SaaS must have an exception paragraph by
  the next review or be replaced by a self-hosted alternative.
- **Monthly Coolify backup drill.** Restore at least one service from backup to a staging box monthly. Validates that the self-host substrate is
  actually recoverable.

## More Information

- ADR 0013 — Yet Analytics SQL LRS self-hosted (the original precedent for this principle).
- ADR 0018 — Coolify on Hetzner as the single-box default.
- ADR 0022 — OSS single-tenant framework scope (the product decision this principle supports).
- [`docs/plan/06-observability-plan.md`](../plan/06-observability-plan.md) — GlitchTip replaces Sentry per this policy.
- [`docs/plan/07-ci-cd-pipeline.md`](../plan/07-ci-cd-pipeline.md) — GitHub-hosted runners default; self-hosted runners gated to specific jobs.
- [`docs/plan/09-dependency-governance.md`](../plan/09-dependency-governance.md) — canonical service list and exceptions.
