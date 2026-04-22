---
status: accepted
date: 2026-04-22
deciders: core team
consulted: Many
informed: future engineering team
supersedes: portions of open-questions OQ-P1-1, OQ-P1-2
---
# 0023 — Rename the framework from Rundown to Lernkit

## Context and Problem Statement

The project's working name was **Rundown**. Before committing code publicly we ran the trademark / common-law / domain-availability check originally
scheduled for P0 exit (OQ-P1-2). The findings — summarized below — made Rundown a bad-value name to ship under. This ADR records the rebrand to
**Lernkit**, the evidence that supports it, and the scope of downstream changes that were made in-repo on the same day.

## Decision Drivers

### Findings that forced the rebrand

- **DPMA (Germany) mark 306647095** for word mark "Rundown" (classes 9 / 38 / 42) — **dead** since 2016-10-31 by owner-requested deletion. Not itself a
  block, but the starting point for the investigation.
- **EUIPO** — no indexable bare-`RUNDOWN` EUTM in classes 9 / 41 / 42. Authoritative eSearch and TMview are JS-gated; confidence medium.
- **USPTO** — no live `RUNDOWN` registration in classes 9, 41, or 42; one live class-25 (apparel) registration of bare `RUNDOWN` held by Christian
  Scott; several `RIG RUNDOWN` (class 9 / 41 — narrow, string-instrument-specific).
- **UKIPO + WIPO Madrid** — no indexable bare-`RUNDOWN` hits in our classes. Confidence low-medium; CAPTCHA-gated.
- **Common-law (the decisive evidence).**
  - **The Rundown AI / Rundown Media Inc.** (rundown.ai, ≈ 2M newsletter subscribers, paid "AI University" with an "AI for Coding" course). Senior
    US common-law user directly in our target class 41 (education services) and class 9 (downloadable educational software). A class-41 registration
    by a new "Rundown" product would likely draw an opposition; even without an opposition, SEO and brand-confusion cost is material.
  - **`elseano/rundown`** — a live GitHub OSS developer CLI that runs executable Markdown. Same category as Lernkit, same bare name, not a legal
    block but an immediate naming and discovery collision on day one.
  - **Rundown Studio**, **Rundown Creator**, **Rundown Assistant** — active class-9 broadcast / production SaaS products named "Rundown".
  - **TheRundown.io** — sports-odds API (class 42 overlap).
  - Multiple "The Rundown" media brands (NBC, NEPM, Public.com) in class 38 / 41.
- **Domains** — `rundown.ai`, `rundown.io`, `rundown.studio`, `rundownstudio.app`, `rundown.com`, `rundown.dev` all held. Only long-tail or hyphenated
  variants available.

### The decision criterion

Even though the registered-mark picture in classes 9 / 41 / 42 was actually clear of direct federal blockers, three practical factors made "Rundown" a
bad-value fight:

1. A strong US common-law senior user (The Rundown AI) in the most relevant class (41 — education services).
2. A same-category OSS project with the identical name on GitHub (`elseano/rundown`).
3. Every usable .dev / .io / .com / .ai / .studio domain already taken.

The cost of the rebrand at Phase 0 (no public code, no npm publish, no GitHub org, zero external references) is near-zero; the cost of the rebrand at
any later phase compounds sharply.

## Considered Options

- **A:** Rebrand to Lernkit (shortlisted + cleared against a pre-check of TLDs, npm, GitHub; full trademark search still needed at P0 exit but with
  Lernkit as the target).
- **B:** Keep "Rundown" but register only in classes 9 + 42 (skip 41 to avoid The Rundown AI opposition); use a hyphenated domain; accept the SEO
  headwind.
- **C:** Keep "Rundown" and file in all three classes anyway; respond to any opposition if and when it comes.

## Decision Outcome

Chosen option: **A — rebrand to Lernkit.**

### Why Lernkit passed the pre-check

Pre-check across eight candidates (Didax, Kadex, Kelm, Codrum, Scriptum, Forma, Vade, Lernkit) on 2026-04-22:

- **All six relevant TLDs unregistered** — `lernkit.dev`, `lernkit.io`, `lernkit.com`, `lernkit.app`, `lernkit.sh`, `lernkit.ai` returned no A record
  and no SOA. The only candidate that cleared every TLD.
- **Unscoped npm package `lernkit`** available on the npm registry.
- **GitHub org / user `lernkit`** available.
- **Semantics** — German compound "lern" (learn) + "kit" reads cleanly as "learning kit", which matches the product (OSS single-tenant framework for
  producing training courses) and stays neutral about the runnable-code angle so it does not over-commit to a feature.
- **Didax** was eliminated despite a clean TLD sweep: `didax.com` resolves to Didax, Inc., a live US K-12 educational-products publisher — a direct
  class-41 adjacency.

### Scope of the rebrand in this repo

Performed on 2026-04-22 in the same commit:

- File renames: `rundown.config.ts` → `lernkit.config.ts`; `apps/api/src/rundown_api/` → `apps/api/src/lernkit_api/`;
  `apps/docs/src/styles/rundown.css` → `apps/docs/src/styles/lernkit.css`; `infra/coolify/rundown.yml` → `infra/coolify/lernkit.yml`.
- Content substitutions across every source file: `RUNDOWN` → `LERNKIT`, `Rundown` → `Lernkit`, `rundown` → `lernkit`, `rundown-dev/rundown` →
  `manykarim/lernkit`. Lockfiles regenerated (`pnpm-lock.yaml`, `apps/api/uv.lock`).
- npm scope: `@rundown/*` → `@lernkit/*`.
- Docker Compose project name: `rundown-dev` → `lernkit-dev`.
- Python package name: `rundown-api` → `lernkit-api`; Python module directory: `rundown_api` → `lernkit_api`.
- Env var prefix: `RUNDOWN_*` → `LERNKIT_*`.
- Documentation references to the product name across all ADRs, DDD docs, and plan docs.

The one file deliberately left alone is the research document at `docs/research/compass_artifact_*.md` — it predates naming and contains zero
occurrences of either name.

### Consequences

- **Clarity, good:** the product name matches the on-disk package names, the on-GitHub repo name, and the as-published npm scope. Single source of
  truth.
- **Portability, good:** a clean first commit under the final name avoids a painful rename across downstream references (mentions in third-party
  blogs, bookmarked commits, etc.) later.
- **Adoption, mixed:** "Lernkit" is a German compound — immediately readable to German speakers, recognizable as "learn kit" to English speakers, but
  less phonetically memorable than a single-word name. Net-positive for the target audience (technical trainers, including a meaningful DACH-region
  slice via the Robot Framework and testing-automation communities).
- **Trademark, improved:** Lernkit is still subject to the full paid legal search at P0 exit (OQ-P1-2 remains a valid open question, retargeted at
  Lernkit). The pre-check only confirmed no indexed collisions on domains / npm / GitHub and no common-law uses reachable via web search.
- **Cost, near-zero:** the rebrand happens before any public code, npm publish, or GitHub org reservation. No downstream breakage.

## Pros and Cons of the Options

### A — rebrand to Lernkit — chosen

- Good: clean domains, clean npm, clean GitHub; no common-law collision surfaced in web search.
- Good: reads as a compound with clear meaning (learn + kit) in both English and German.
- Good: the Phase 0 cost of rebranding is the smallest it will ever be.
- Bad: loses the "runnable code" hint that "Rundown" carried phonetically. Accepted; the three-letter "run" is not a strong enough brand hook to keep
  a landmined name for.

### B — keep "Rundown" in classes 9 + 42 only; use a hyphenated domain

- Good: no rebrand cost today.
- Bad: compromised domains and SEO indefinitely; The Rundown AI still wins "rundown" brand searches; `elseano/rundown` still creates package / repo
  naming confusion on GitHub.

### C — keep "Rundown" and file in class 41 anyway

- Good: simplest today.
- Bad: materially raises opposition risk against The Rundown AI's common-law senior use in exactly that class.

## Validation

- **Pre-check** (2026-04-22) — eight candidates batch-checked against DNS SOA records for six TLDs, the npm registry, and the GitHub users API. Only
  Lernkit swept all three.
- **Rebrand completeness** — `grep -rI "[Rr]undown\|RUNDOWN"` across the repo (excluding generated outputs and lockfiles) returns zero matches.
- **Post-rebrand validation pipeline, 2026-04-22:**
  - `pnpm lint` — 14 files, 0 errors.
  - `pnpm test` — 9 / 9 vitest tests pass.
  - `pnpm build` — 3 / 3 packages build; 6 HTML pages produced; Pagefind index intact.
  - `uv run ruff check` + `uv run ruff format --check` — all pass.
  - `uv run mypy src` — 0 issues in 5 source files.
  - `uv run pytest` — 3 / 3 pass.
- **Full paid trademark search** — still required at P0 exit (2026-05-11), now retargeted at Lernkit (OQ-P1-2).

## Open questions this ADR updates

- **OQ-P1-1 (npm scope):** decided value changes from `@rundown/*` to `@lernkit/*`. Reservation at P0 exit still in force.
- **OQ-P1-2 (trademark search):** the provisional clearance of Rundown via the no-paid-search route is withdrawn; the commissioned search at P0 exit
  targets Lernkit instead. Pre-check evidence noted above suggests Lernkit will clear the paid search, but the paid search is still required.

## More Information

- Research §9 "Open questions worth resolving before phase 1".
- Trademark search agents' findings, 2026-04-22 (EUIPO, USPTO, UKIPO + WIPO Madrid, common-law).
- Pre-check results for the candidate shortlist, 2026-04-22.
- ADR 0014 — MIT license (unchanged).
- ADR 0022 — OSS single-tenant scope (unchanged).
- `docs/plan/10-open-questions.md` — decision log updated with OQ-P1-1 and OQ-P1-2 resolutions dated 2026-04-22.
