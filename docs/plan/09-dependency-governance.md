# 09 — Dependency Governance

> License allow-list, vendoring policy for single-maintainer critical dependencies, upgrade SLAs for major dependencies, and supply-chain posture. Cross-references ADR 0014, ADR 0021, ADR 0022, [`PRODUCT-SHAPE.md`](./PRODUCT-SHAPE.md), [`05-security-model.md`](./05-security-model.md) §5, [`07-ci-cd-pipeline.md`](./07-ci-cd-pipeline.md) §2.2 and §6, and [`04-risk-register.md`](./04-risk-register.md) R-09 / R-11 / R-12 / R-14 / R-18.

## 0. Infrastructure dependencies — self-host-first (ADR 0021)

**Self-host-first 2026-04-21 per [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md).** Every infrastructure dependency that is practical to self-host runs on the Coolify + Hetzner box ([ADR 0018](../adr/0018-coolify-on-hetzner-for-self-hosting-default.md)). SaaS is only adopted with a named, justified exception. This section is the canonical service table; it is parsed by the `infra-self-host-policy` CI gate in [`07-ci-cd-pipeline.md`](./07-ci-cd-pipeline.md) §2.2.

### 0.1 Canonical service table

| Service | Choice | Location | Justification / exception |
|---|---|---|---|
| Error tracking | **GlitchTip self-hosted** (~3 containers, Sentry SDK-compatible) | Coolify box | Self-hosted — no PII leaves the box; migration path to self-hosted Sentry if volume demands it. |
| Metrics / traces / logs | **OpenTelemetry + Grafana + Prometheus + Loki + Tempo self-hosted** | Coolify box | Self-hosted — already in [`06-observability-plan.md`](./06-observability-plan.md). |
| Chat | **Mattermost self-hosted** | Coolify box | Self-hosted — replaces any SaaS chat vendor per ADR 0021. |
| Community forum | **GitHub Discussions** P0–P2; **Discourse self-hosted** from P3 | GitHub (exception) → Coolify box | GitHub Discussions ride the GitHub exception; Discourse is self-hosted once the community warrants it. **Discord is explicitly dropped.** |
| Internal package registry | **Verdaccio self-hosted** (caching proxy for npm) | Coolify box | Self-hosted — insulates CI + local dev from npm availability. |
| CI runners | **GitHub-hosted `ubuntu-latest` by default**; self-hosted only for named §10.2 exceptions in [`07-ci-cd-pipeline.md`](./07-ci-cd-pipeline.md) | GitHub (exception) + dedicated Hetzner box for exceptions | GitHub exception for hosted runners; self-hosted runners are ephemeral + single-use and never exposed to PRs from untrusted forks. |
| Source / issues / advisories | **GitHub** | SaaS | **Explicit exception** per ADR 0021 — contributors already have GitHub accounts; migration path is Forgejo + Woodpecker. |
| Container registry | **GHCR** (GitHub Container Registry) | SaaS | **Explicit exception** per ADR 0021 — public images need public discoverability. |
| Package registry (publish) | **npm public registry** for `@lernkit/*` | SaaS | **Explicit exception** per ADR 0021 — public discoverability of the `@lernkit/*` scope requires the real registry; mitigated by the Verdaccio caching proxy for CI + local dev. |
| LRS | **Yet Analytics SQL LRS self-hosted** | Coolify box | Self-hosted — data residency for xAPI statements (ADR 0013). |
| CMS | **Keystatic** in-repo | In-repo | Self-hosted — no separate service (ADR 0012). |
| Search | **Pagefind** static | Build-time | Self-hosted — bakes into the site and SCORM packages (ADR 0002). |
| Status / uptime | **Uptime Kuma self-hosted** | Coolify box | Self-hosted. |
| Secrets | **SOPS + age** in-repo, encrypted | In-repo | Self-hosted — no Vault until cross-team rotation is needed. |

### 0.2 Adoption sub-policy

A new infrastructure service is adopted in the order of preference defined in [ADR 0021 §Policy](../adr/0021-self-host-first-infrastructure-principle.md#policy):

1. Reuse something already in the Coolify stack if it covers the need.
2. Self-host the OSS project on the Coolify box.
3. Self-host on a separate Hetzner instance if resource-profile incompatibility demands it.
4. Only with all three above infeasible: SaaS with an explicit ADR paragraph naming the reason, the cost, and the migration path to reclaim the service if we later want to.

A PR that introduces a new SaaS row in §0.1 fails the **`infra-self-host-policy`** CI gate ([`07-ci-cd-pipeline.md`](./07-ci-cd-pipeline.md) §2.2) unless an accompanying ADR paragraph justifies it per ADR 0021 §Policy. The CI gate diffs the service table against the previous commit; newly-added SaaS rows must be accompanied by a linked ADR paragraph in the PR description.

Quarterly arch review walks the table. Every SaaS row either keeps its exception paragraph or is replaced by a self-hosted alternative.

## 1. License allow-list (ADR 0014)

### 1.1 Auto-approved (CI passes on first sight)

- **MIT**
- **Apache-2.0**
- **BSD-2-Clause**, **BSD-3-Clause**
- **ISC**
- **MPL-2.0**
- **CC0-1.0**
- **Unlicense** (with caveat — some jurisdictions don't recognize; review if critical)

Rationale: permissive licenses that allow redistribution inside the MIT-licensed Lernkit core (ADR 0019) and do not introduce copyleft obligations on distributed artifacts.

### 1.2 Requires human review before adoption (CI fails with `review-needed` tag)

- **LGPL-2.1**, **LGPL-3.0** — dynamic linking is usually OK; static linking triggers copyleft. Runner-image use acceptable if the LGPL dep is a standalone binary, not statically linked to Lernkit code.
- **EPL-2.0** — compatible with Apache-2.0 but has reciprocity clauses for modifications.
- **CDDL-1.0** — uncommon but appears in some JVM deps; requires review if we ever add JVM runners.
- **Artistic-2.0**, **BSD-4-Clause** (advertising clause concern) — review before including.
- **Zlib**, **BSL-1.0** — usually fine; reviewed to confirm.

Review protocol:

1. Engineer adding the dep files a GitHub issue with the dep name, license, and use case.
2. FE-1 or SEC (from P5) reviews within 3 business days.
3. Decision documented in the issue; if approved, dep added to `package.json` `"licenses.overrides"` allow-list with a reference to the issue.

### 1.3 Rejected by default (CI fails, no override without ADR)

- **GPL-2.0**, **GPL-3.0** — copyleft; incompatible with MIT-licensed Lernkit distribution.
- **AGPL-3.0** — network-use copyleft; catastrophic for a self-hosted framework that customers deploy themselves.
- **SSPL** — MongoDB's anti-cloud license; treated as AGPL-equivalent.
- **CC-BY-NC**, **CC-BY-ND**, **CC-BY-NC-SA**, **CC-BY-NC-ND** — non-commercial or no-derivatives clauses; incompatible with open-source project distribution.
- **Commercial**, **proprietary**, **custom** — permitted **only** as opt-in enterprise integrations with explicit customer license, **never** bundled in the Lernkit core. Examples: StackBlitz WebContainers, PrinceXML, Rustici SCORM Engine.

### 1.4 Known exceptions (read-only reference, not bundled)

- **Adapt Framework (GPL v2)** — reference implementation for SCORM Spoor (Research §1.2). Read only; **never forked, never vendored, never linked**.
- **H5P (MIT core, some types GPL)** — embedded via `h5p-standalone` (MIT) which renders `.h5p` packages client-side. Host framework remains MIT. Individual `.h5p` content types may be GPL; those are **learner-side content**, not bundled Lernkit code.
- **Judge0 (GPL v3)** — if used, invoked over HTTP only; no linking. Requires legal review before enabling (Research §4.3). Self-hosted deployment means the customer operates the GPL service, not Lernkit.

### 1.5 Enforcement

- `license-checker` runs on every PR ([`07-ci-cd-pipeline.md`](./07-ci-cd-pipeline.md) §2.2).
- Allow-list defined in `ci/license-allowlist.json`.
- Override requires a PR that both adds the license to the allow-list **and** creates/updates the relevant ADR. Same PR cannot both add a dep and its license exception — split into two PRs (exception PR first, merge, then dep PR).

## 2. Vendoring policy

### 2.1 Criteria for vendoring

A dep must be vendored (source-copied into `vendor/<dep-name>/`) if **any two** of the following are true:

- Single maintainer (bus factor 1 per GitHub history last 12 months).
- No release in the past 24 months but still functional and widely used.
- Security-sensitive in Lernkit's trust boundary (handles SCORM/cmi5/xAPI, code execution, auth).
- < 500 monthly downloads (npm or PyPI) — low community scrutiny.

### 2.2 Vendored deps at P0 start

Per ADR 0014 and risk R-09:

| Dep | Reason | Vendoring mode |
|---|---|---|
| **scorm-again** (jcputney) | Single maintainer; security-sensitive; core trust boundary | Full source copy at `vendor/scorm-again/`; pin exact version; our CI runs its tests plus our own; contribute upstream via PRs from our fork |
| **simple-scorm-packager** (lmihaidaniel) | 4-year stale release; security-sensitive; core trust boundary | Full source copy at `vendor/simple-scorm-packager/`; effectively dead-code-we-own; maintain in-house; contribute back if the upstream revives |
| **react-scorm-provider** (code-by-dwayne fork) | The upstream is abandoned; fork is the maintained one; small scope | Full source copy; track upstream fork for security fixes |

### 2.3 Not vendored but watched

- **Keystatic** — too large to vendor; Sveltia CMS fallback ready (ADR 0011). Watched via:
  - Monthly upstream check for release cadence.
  - Pinned exact version in `pnpm-lock.yaml`.
  - Internal fork branch ready in case of sudden abandonment.
- **Pyodide** — upstream is well-maintained and not a candidate; but risk R-13 (storage bloat) tracked.
- **rf-mcp** — Many owns upstream cadence (risk R-18); pinned `v<minor>` in runner image; monthly upgrade cycle.

### 2.4 Vendoring workflow

1. Create branch `vendor/<dep-name>-v<version>`.
2. `git subtree add --prefix vendor/<dep-name> <upstream-remote> v<version> --squash`.
3. Write a `vendor/<dep-name>/VENDORED.md` explaining: why vendored, source URL, version, divergence from upstream, maintainer (role name).
4. Update `package.json` or `pyproject.toml` to use the local path.
5. CI runs upstream's test suite plus Lernkit's integration tests.
6. ADR updated with status.

### 2.5 Upstream contribution SLA

For vendored deps, Lernkit contributes upstream:

- **scorm-again:** any bug we fix locally must be filed upstream within 14 days. Any enhancement we write must be PR'd upstream within 30 days of shipping internally.
- **simple-scorm-packager:** if upstream revives, Lernkit's in-house fork is offered as the basis for revival.
- **react-scorm-provider:** security fixes upstreamed within 14 days; enhancements at discretion.

## 3. Upgrade SLAs for major deps

| Dep | Cadence | SLA for upgrade after major release |
|---|---|---|
| **Astro** | Every major | Investigate within 30 days; dry-run in reproduction repo within 60 days; upgrade in Lernkit within 90 days unless breaking for us |
| **Starlight** | Every major | Track with Astro; upgrade at the same cadence |
| **MDX** | Every major | 60 days to investigate, 180 days to upgrade if breaking (risk R-14); codemods in reproduction repo |
| **React** | Every major | Trail by one major release; upgrade in the release after ecosystem parity (6–12 months) |
| **Node.js** | LTS | Upgrade to new LTS within 90 days of availability; deprecate old LTS within 180 days |
| **Python** | CPython minor | Upgrade runner image within 60 days of upstream release |
| **Pyodide** | Every minor | Review within 14 days; upgrade within 60 days if no regressions |
| **FastAPI** | Every minor | Within 30 days; review breaking-change notes |
| **SQLAlchemy** | Every major | Within 180 days |
| **Postgres** | LTS | Upgrade to new LTS within 180 days of availability |
| **Robot Framework** | Every minor | Many drives; image upgrade within 30 days of Lernkit compatibility check |
| **gVisor runsc** | Every release | Security releases within 14 days; feature releases within 30 days |
| **scorm-again** (vendored) | Every release | 14 days to integrate |
| **Keystatic** | Every minor | Within 60 days |

## 4. Supply-chain posture

### 4.1 Package registry signatures

- **npm:** `pnpm audit signatures` runs on every PR. Enforces Sigstore or OpenPGP signatures on all production deps. Failure blocks merge.
- **PyPI:** `pip-audit` and verification of PyPI attestations where available. Migrating to Sigstore attestations as PyPI rollout stabilizes.
- **Container images:** cosign signature on base images (`FROM gcr.io/distroless/*` already Sigstore-signed); our own release images signed per [`07-ci-cd-pipeline.md`](./07-ci-cd-pipeline.md) §4.2.

### 4.2 Lockfile discipline

- **pnpm-lock.yaml** and **poetry.lock** under version control.
- **Per-PR lockfile review** — any lockfile-only PR (bot-authored) still requires a human reviewer. Humans spot-check for unexpected version changes, suspicious new deps, and license drift.
- **No postinstall scripts** for third-party deps unless explicitly allow-listed. Enforced via `.npmrc`: `enable-pre-post-scripts=false` by default; overrides per-dep in `.npmrc.local`.

### 4.3 Reproducible builds

- pnpm workspaces + `pnpm-lock.yaml` + fixed Node version (via `.nvmrc` / `packageManager` field) → reproducible JS builds.
- Poetry with exact lockfile + Python version in `pyproject.toml` → reproducible Python builds.
- Container builds use pinned base-image digests (`FROM gcr.io/distroless/python3-debian12@sha256:...`).
- CI emits build provenance per SLSA Level 2 (attested to the image via cosign) from P5.

### 4.4 Package registry posture (Self-host-first 2026-04-21 per ADR 0021)

- **Publish target — npm public registry (explicit exception per ADR 0021).** We publish `@lernkit/*` packages to the public npm registry for discoverability; npm is accepted as a GitHub-style exception because public discoverability of a public OSS scope requires the real registry. Migration path if npm ever becomes unavailable to us: switch publish target to a self-hosted Verdaccio with upstream mirroring, accept the discoverability hit, file an ADR.
- **Internal caching proxy — Verdaccio self-hosted.** All CI builds and local-dev `pnpm install` go through a Verdaccio instance on the Coolify box. This insulates CI and local dev from npm availability and from upstream package-yanking or tampering between lockfile update and build time. Vendor-pinned + lockfile-verified: the Verdaccio instance only accepts versions that match the committed `pnpm-lock.yaml` digests.
- **PyPI.** `poetry.lock` + `pip-audit` is the primary discipline; no internal PyPI mirror until a PyPI outage demonstrates the need.
- **Private package scopes.** `@lernkit/*` is public by design. If a private internal scope is ever needed (none currently), it will live on the same Verdaccio instance with auth required; no write access without MFA and Sigstore signing.

### 4.5 Container registry posture (Self-host-first 2026-04-21 per ADR 0021)

- **Public images — GHCR (explicit exception per ADR 0021).** Lernkit's public container images (`ghcr.io/lernkit/*`) live on GitHub Container Registry. GHCR rides the GitHub exception in ADR 0021 (source, issues, Actions, registry treated as one account/provider).
- **Private images — none currently.** If a private internal container ever becomes necessary (none today), it goes on a self-hosted registry (Harbor or Distribution) on the Coolify box, not on a SaaS registry other than GHCR.

### 4.6 Typosquatting defense

- Namespace all internal packages under `@lernkit/*`.
- Register defensive packages on npm for the most likely typosquat names (`@lernkit/tracker` → reserve `@lernkit-tracker`, etc.).
- Any new dep name is checked against a known-typosquat database (via `socket-security` or similar) during PR review.

### 4.7 Malicious-package incident response

Ties to [`05-security-model.md`](./05-security-model.md) §6:

1. **Detect.** PR fails audit / signature / `socket-security` check.
2. **Contain.** Revert PR; invalidate any build artifact that used the dep; rotate any secret the build had access to.
3. **Eradicate.** Remove dep; find alternative; open ADR if replacement changes architecture.
4. **Recover.** Re-deploy clean build.
5. **Learn.** Post-mortem; update this document if process changes.

## 5. Update triage board

A standing GitHub Project board `Dep Upgrades` tracks pending upgrades with columns:

- **Proposed** (Renovate PR open)
- **Investigating** (engineer assigned, reproduction repo active)
- **Ready** (passes all tests locally; awaits merge window)
- **Merged**
- **Blocked** (upstream issue, waiting on maintainer)
- **Deferred** (we've decided not to upgrade — ADR required if it's a security-relevant dep)

Triage cadence: weekly at the architecture review.

## 6. Deprecation policy for Lernkit's own packages

When Lernkit publishes `@lernkit/tracker`, `@lernkit/packagers`, etc.:

- **Semver strict.** Breaking changes only on major bumps.
- **Deprecation window:** deprecated APIs emit console warnings for one full minor version before removal. Removal only on next major.
- **Migration guide** per major in `MIGRATION.md`.
- **LTS major:** P5 major (v1.0.0) gets 18 months of security patches after v2 ships.

## 7. Audit log

- `docs/deps/audit-log.md` — append-only log of dep additions, removals, and license changes. One line per event: date, dep, action, license, who, PR link.
- Reviewed quarterly at the re-plan meeting.

## 8. Open questions (tracked in [`10-open-questions.md`](./10-open-questions.md))

- OQ-DEP-1: Do we permit LGPL static-linked deps in the runner image? Decision owner: SEC (from P5); deadline: 2026-11-15 (P3 exit).
- OQ-DEP-2: Do we publish Lernkit's packages on npm under a scoped `@lernkit/*` name or under a neutral name? Decision owner: FE-1; deadline: 2026-07-06 (P1 exit).
- OQ-DEP-3: Do we adopt `socket-security` (paid) for real-time malicious-package detection or rely on GitHub Dependabot + Renovate alone? Decision owner: SEC; deadline: 2027-01-18 (P4 exit).
