# 10 — Open Questions

> Tracked list of every open decision. Each has an owner (role name per [`08-team-and-raci.md`](./08-team-and-raci.md)), an absolute deadline, and a
> decision trigger. Decisions made are moved into the decision-log section at the bottom; they are not deleted — the register is a history of how the
> project's thinking evolved.

Today's date: **2026-04-22**. Phase 0 exit: **2026-05-11**.

Three scope-defining ADRs are in force: [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md) (self-host-first infrastructure principle,
2026-04-21), [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) (OSS single-tenant framework scope, 2026-04-21), and
[ADR 0023](../adr/0023-rename-framework-from-rundown-to-lernkit.md) (**rebrand from Rundown → Lernkit**, 2026-04-22) — the last triggered by the
trademark-search evidence described in the ADR. Many items from the original research-§9 list are closed as deleted by ADR 0022; OQ-P1-1 and OQ-P1-2
were updated by ADR 0023. See the decision log.

## Open-question statuses

- **open** — not yet owned or researched.
- **researching** — owner actively gathering input.
- **proposed** — proposed decision drafted; awaiting review.
- **decided** — resolved; moved to the decision log; ADR filed if architectural.
- **deleted** — explicitly removed from scope (out-of-scope per ADR 0022 or equivalent). Not revisitable without a superseding ADR.
- **deferred** — pushed to a later phase; new deadline set.

## Register

### From Research §9 (Open Questions Worth Resolving Before Phase 1)

| ID | Question | Owner | Deadline | Decision trigger | Status |
|---|---|---|---|---|---|
| OQ-R-1 | **License of the framework itself.** MIT vs Apache 2.0 vs AGPL? | FE-1 | — | `LICENSE` file at repo root before first public commit | **decided 2026-04-21: MIT (ADR 0014)** |
| OQ-R-2 | **Hosted SaaS vs OSS-only.** | FE-1 + Many | — | Business model decision | **deleted 2026-04-21 per ADR 0022 (no hosted SaaS)** |
| OQ-R-3 | **Course marketplace governance.** | FE-1 + SEC | — | Marketplace MVP | **deleted 2026-04-21 per ADR 0022 (no marketplace)** |
| OQ-R-4 | **Target LMS certification.** Official SCORM Certified status via ADL. | FE-1 | 2027-10-18 (post-P5) | Reframed: technical validation value vs cost | **deferred past P5; reframed as technical-validation question, no longer marketing-driven** |
| OQ-R-5 | **AI authoring assist.** Phase 4+ feature; BYO-API-key. | FE-1 + ID | 2026-11-30 (P3 exit) | P4 scope lock | researching |

### Plan-surfaced questions (P0 exit)

| ID | Question | Owner | Deadline | Decision trigger | Status |
|---|---|---|---|---|---|
| OQ-P0-1 | **Calendar start date.** | FE-1 + Many | — | Plan consistency | **decided: 2026-04-20** |
| OQ-P0-2 | **FTE allocation per workstream per phase.** | FE-1 + Many | — | Phase plan ratification | **decided 2026-04-21: proposed split ratified; next review at P1 exit** |
| OQ-P0-3 | **RACI role names.** | Many | — | Hiring req writing | **decided: FE-1 / FE-2 / BE-1 / Many / ACC / ID / SEC** |
| OQ-P0-4 | **Monorepo tool: Turborepo vs Nx vs plain pnpm.** | FE-1 | — | Monorepo scaffold PR | **decided 2026-04-21: Turborepo** |
| OQ-P0-5 | **Preview-environment host.** | FE-1 | — | Deploy recipe PR | **decided 2026-04-21: Coolify from day one; docker-compose for local dev; no stopgap** |
| OQ-P0-6 | **Error tracking: SaaS vs self-hosted.** | BE-1 (Many drafts) | — | Observability plan finalization | **decided 2026-04-21: GlitchTip self-hosted on Coolify box (ADR 0021)** |
| OQ-P0-7 | **Primary internal chat tool.** | Many | — | Team onboarding | **decided 2026-04-21: Mattermost self-hosted on Coolify box (ADR 0021)** |
| OQ-P0-8 | **Community support channel.** | Many | — | [`08-team-and-raci.md`](./08-team-and-raci.md) | **decided 2026-04-21: GitHub Discussions P0–P2; self-hosted Discourse at P3; Discord explicitly dropped** |
| OQ-P0-9 | **MDX primary + Markdoc secondary.** | FE-1 + ID | — | ADR 0016 | **decided 2026-04-21: ratified per ADR 0016** |
| OQ-P0-10 | **Zod v3 or v4.** | FE-2 | — | Content-collection schema PR | **decided 2026-04-21: Zod v3, pinned to Astro's built-in `z` import; migrate when Astro moves** |
| OQ-P0-11 | **CI runners: GitHub-hosted vs self-hosted.** *(new 2026-04-21)* | FE-1 + SEC | 2026-05-11 | CI pipeline finalization | **decided 2026-04-21: GitHub-hosted by default; self-hosted only for sandbox-runner benchmarks or bare-metal gVisor/KVM jobs; never on PRs from forks** |

### Plan-surfaced questions (P1 exit)

| ID | Question | Owner | Deadline | Decision trigger | Status |
|---|---|---|---|---|---|
| OQ-P1-1 | **npm scope name: `@lernkit/*` or neutral?** | FE-1 | 2026-05-11 (reserve at P0 exit) | First `@lernkit/tracker` publish | **decided 2026-04-21 (`@rundown/*`); revised 2026-04-22 per [ADR 0023](../adr/0023-rename-framework-from-rundown-to-lernkit.md) to `@lernkit/*`; reservation at P0 exit still in force** |
| OQ-P1-2 | **Framework name trademark / legal check.** The working name is now **Lernkit** after the 2026-04-22 rebrand. | Many | 2026-05-11 (run search at P0 exit) | Public npm / GitHub org creation | **revised 2026-04-22 per [ADR 0023](../adr/0023-rename-framework-from-rundown-to-lernkit.md): Rundown surfaced a material common-law senior (The Rundown AI) in class 41 and a same-category GitHub collision (`elseano/rundown`); all usable domains taken. Rebranded to Lernkit. Pre-check (2026-04-22) cleared Lernkit on DNS / npm / GitHub. Paid search at P0 exit is retargeted at Lernkit; budget $500–1,500; file provisional class 41 mark at P1 start if cleared.** |
| OQ-P1-3 | **Anchor enterprise customer for Phase 5.** | Many | — | P5 scope realism | **deleted 2026-04-21 per ADR 0022; replaced by conformance-coverage success metric** |
| OQ-P1-4 | **Color-blind palette for LMS compatibility matrix.** | FE-1 | 2026-07-06 (P1) | Matrix publishing | **decided 2026-04-21: Okabe-Ito 8-color palette with ✅/⚠️/❌ text labels as primary signal, color as reinforcement (WCAG 1.4.1)** |

### Plan-surfaced questions (scorm-again legal verification)

| ID | Question | Owner | Deadline | Decision trigger | Status |
|---|---|---|---|---|---|
| OQ-P0-12 | **scorm-again upstream license verification** (ADR 0005 flagged). | SEC (pre-hire: Many) | 2026-05-11 (P0 exit) | Shipping first packager uses scorm-again | **decided 2026-04-21: commission fixed-scope ($1,000–1,500) legal memo from an OSS-specialist firm; scope covers per-file license, LGPL-3 static-linking posture for SCORM-package distribution, NOTICE requirements; batch with OQ-P3-4** |
| OQ-P3-4 | **LGPL static linking in runner images.** | SEC (pre-hire: Many) | 2026-05-11 (batched with OQ-P0-12) | Dependency-governance exceptions | **batched with OQ-P0-12; same legal engagement** |

### Plan-surfaced questions (manifest pipeline)

| ID | Question | Owner | Deadline | Decision trigger | Status |
|---|---|---|---|---|---|
| OQ-P1-5 | **Manifest template engine: Nunjucks vs Handlebars.** *(was inside ADR 0015 flag)* | FE-2 | 2026-05-11 | Packager scaffolding | **decided 2026-04-21: Nunjucks; Jinja-familiarity for RF authors; macros useful for XML manifest complexity** |
| OQ-P1-6 | **`plain-html` build target: auto-publish as public SEO vs opt-in.** | FE-1 + Many | 2026-05-11 | Packager scaffolding | **decided 2026-04-21: opt-in via explicit `lernkit.config.ts` → `plain-html: { publicAccess: true, publicUrl: '...' }`; default is private** |

### Plan-surfaced questions (P2 exit)

| ID | Question | Owner | Deadline | Decision trigger | Status |
|---|---|---|---|---|---|
| OQ-P2-1 | **Pyodide mobile strategy.** | FE-2 | 2026-09-07 (P2) | Risk R-06 mitigation | proposed (defer to P4) |
| OQ-P2-2 | **Pyodide in-browser RF.** | Many + FE-2 | 2026-09-07 (P2) | Runnable RF scope | proposed (P3, labeled experimental) |
| OQ-P2-3 | **PDF fallback when Paged.js fails.** | FE-2 | 2026-09-07 (P2) | PDF pipeline resilience | open |

### Plan-surfaced questions (P3 exit)

| ID | Question | Owner | Deadline | Decision trigger | Status |
|---|---|---|---|---|---|
| OQ-P3-1 | **Pen-test vendor selection.** | Many (pre-SEC) | — | First pen-test scheduling | **reframed 2026-04-21: scope narrowed per ADR 0022; no scheduled enterprise pen-test cadence. Targeted sandbox review by an external firm at end of P3 only; budget $5,000–10,000 for a one-week engagement** |
| OQ-P3-2 | **Judge0 inclusion.** Optional multi-language runner. | BE-1 + Many | 2026-10-31 | Runner-pool image matrix | open |
| OQ-P3-3 | **LRS retention defaults.** | BE-1 | 2026-10-31 | [`05-security-model.md`](./05-security-model.md) | open — proposal: 90 days raw, 365 days aggregates, user-configurable |
| OQ-P3-5 | **RTL sample course language.** Hebrew or Arabic? | FE-1 + ID | 2026-10-31 | P3 a11y/i18n exit | open |
| OQ-P3-6 | **`<H5P>` embed content-type licensing.** Tenant-visible warning? | FE-1 + SEC (pre-hire: Many) | 2026-10-31 | H5P embed ship | open |

### Plan-surfaced questions (P4 exit)

| ID | Question | Owner | Deadline | Decision trigger | Status |
|---|---|---|---|---|---|
| OQ-P4-1 | **Translation workflow: Crowdin vs file-based?** | ACC | 2026-12-31 (P4) | i18n workflow adoption | **reframed 2026-04-21: Crowdin is SaaS (ADR 0021 exception would be required); prefer file-based PO/MO or JSON workflow** |
| OQ-P4-2 | **AI-assist provider.** Anthropic-first vs provider-agnostic. BYO-API-key always. | FE-1 + ID | 2027-01-11 (P4) | AI-assist scope | open |
| OQ-P4-3 | **`<Scrim>` audio recording storage.** | FE-1 | 2026-12-31 | P4 Scrim ship | open |
| OQ-P4-4 | **LRS dashboard query engine.** Raw SQL vs Metabase embed vs custom React. | BE-1 + ID | 2027-01-11 | Dashboard implementation | open — note: if Metabase, self-hosted per ADR 0021 |
| OQ-P4-5 | **Paid malicious-package detection subscription.** | SEC (pre-hire: Many) | 2027-01-18 (P4) | Dependency governance | **deferred — given self-host-first posture and small contributor surface, low priority; revisit if contributor surface grows** |

### Plan-surfaced questions (P5 — Conformance & Polish)

| ID | Question | Owner | Deadline | Decision trigger | Status |
|---|---|---|---|---|---|
| OQ-P5-1 | **Bug bounty platform.** | SEC | — | Bug bounty launch | **simplified 2026-04-21: credit-only disclosure program via `SECURITY.md` + GitHub security advisories; no HackerOne / Intigriti subscription** |
| OQ-P5-2 | **Bug bounty payout tiers.** | SEC | — | Bug bounty launch | **deleted 2026-04-21: no cash bounty per OQ-P5-1 simplification; credit only** |
| OQ-P5-3 | **Stripe Tax vs custom tax provider.** | BE-1 | — | Billing launch | **deleted 2026-04-21 per ADR 0022 (no billing)** |
| OQ-P5-4 | **Multi-tenant mode.** | BE-1 + SEC | — | Multi-tenant scale-up | **deleted 2026-04-21 per ADR 0022 (single-tenant)** |
| OQ-P5-5 | **Customer-BI export format.** | BE-1 | — | Enterprise reporting launch | **deleted 2026-04-21 per ADR 0022; raw xAPI archive from the LRS remains available** |
| OQ-P5-6 | **Marketplace governance.** | FE-1 + SEC | — | Marketplace launch | **deleted 2026-04-21 per ADR 0022 (no marketplace; duplicate of OQ-R-3)** |
| OQ-P5-7 | **EU-region managed LRS.** | Many | — | GDPR DPIA template | **deleted 2026-04-21 per ADR 0022 (customers self-host)** |

### Ongoing (no phase-bound deadline)

| ID | Question | Owner | Review cadence | Status |
|---|---|---|---|---|
| OQ-X-1 | **Astro major-upgrade strategy.** Tied to risk R-11. | FE-1 | per Astro major | monitoring |
| OQ-X-2 | **Robot Framework minor-upgrade strategy.** Tied to R-12. | Many | per RF minor | monitoring |
| OQ-X-3 | **MDX 3 → MDX 4 migration.** Tied to R-14. | FE-1 | quarterly | monitoring |
| OQ-X-4 | **Community-contributed widget review SLA.** | FE-1 | quarterly | open |
| OQ-X-5 | **Hetzner vs alternative hosts.** | Many + BE-1 | annually | monitoring |
| OQ-X-6 | **H5P bundled-content licensing notice.** | FE-1 + SEC | per release | open |
| OQ-X-7 | **Zod v3 → v4 migration.** *(new 2026-04-21)* Tied to OQ-P0-10. Auto-migrate when Astro moves. | FE-2 | per Astro minor | monitoring |
| OQ-X-8 | **Coolify single-maintainer cadence.** *(new 2026-04-21)* Fallback plan: vanilla Docker Compose + nginx-proxy. | Many | quarterly | monitoring |

## Decision log

All decisions made, in chronological order. Closed questions remain in the register above with their `decided` / `deleted` / `deferred` status so the reasoning is preserved alongside the record.

| Date | ID | Decision | Reference |
|---|---|---|---|
| 2026-04-20 | OQ-P0-1 | Calendar start 2026-04-20 | plan consistency |
| 2026-04-20 | OQ-P0-3 | RACI role names: FE-1 / FE-2 / BE-1 / Many / ACC / ID / SEC | [`08-team-and-raci.md`](./08-team-and-raci.md) |
| 2026-04-21 | OQ-R-1 | License: MIT core | [ADR 0014](../adr/0014-mit-license-for-framework-core.md) |
| 2026-04-21 | OQ-R-2 | Deleted — no hosted SaaS | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-R-3 | Deleted — no marketplace | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-R-4 | Deferred past P5; reframed as technical-validation | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-P0-2 | FTE allocation ratified | [`02-phase-plan.md`](./02-phase-plan.md) |
| 2026-04-21 | OQ-P0-4 | Monorepo: Turborepo | — |
| 2026-04-21 | OQ-P0-5 | Preview host: Coolify from day one | [ADR 0018](../adr/0018-coolify-on-hetzner-for-self-hosting-default.md) |
| 2026-04-21 | OQ-P0-6 | Error tracking: GlitchTip self-hosted | [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md), [`06-observability-plan.md`](./06-observability-plan.md) |
| 2026-04-21 | OQ-P0-7 | Internal chat: Mattermost self-hosted | [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md) |
| 2026-04-21 | OQ-P0-8 | Community: GitHub Discussions P0–P2; Discourse self-hosted at P3; Discord dropped | [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md) |
| 2026-04-21 | OQ-P0-9 | MDX primary + Markdoc secondary | [ADR 0016](../adr/0016-embed-h5p-via-h5p-standalone-for-long-tail-content.md) |
| 2026-04-21 | OQ-P0-10 | Zod v3 pinned to Astro | [`01-workstreams-and-dependencies.md`](./01-workstreams-and-dependencies.md) |
| 2026-04-21 | OQ-P0-11 | CI runners: GitHub-hosted default | [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md), [`07-ci-cd-pipeline.md`](./07-ci-cd-pipeline.md) |
| 2026-04-21 | OQ-P0-12 | Commission fixed-scope scorm-again + LGPL legal memo | [ADR 0005](../adr/0005-scorm-again-as-primary-lms-api-wrapper.md) |
| 2026-04-21 | OQ-P1-1 | npm scope: `@rundown/*`; reserve at P0 exit | — |
| 2026-04-22 | OQ-P1-1 | **Revised**: npm scope is `@lernkit/*` (Rundown → Lernkit rebrand) | [ADR 0023](../adr/0023-rename-framework-from-rundown-to-lernkit.md) |
| 2026-04-21 | OQ-P1-2 | Trademark search at P0 exit (targeting Rundown) | — |
| 2026-04-22 | OQ-P1-2 | **Revised**: Rundown rejected on common-law evidence (The Rundown AI senior in class 41; `elseano/rundown` GitHub collision; domains taken). Rebrand to Lernkit. Paid search retargeted at Lernkit | [ADR 0023](../adr/0023-rename-framework-from-rundown-to-lernkit.md) |
| 2026-04-21 | OQ-P1-3 | Deleted — replaced by conformance-coverage metric | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-P1-4 | Okabe-Ito palette + text labels primary | — |
| 2026-04-21 | OQ-P1-5 | Template engine: Nunjucks | [ADR 0015](../adr/0015-one-source-many-outputs-build-pipeline.md) |
| 2026-04-21 | OQ-P1-6 | `plain-html` target: opt-in default | [ADR 0015](../adr/0015-one-source-many-outputs-build-pipeline.md) |
| 2026-04-21 | OQ-P5-1 | Credit-only disclosure program (no paid bounty) | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-P5-2 | Deleted — no cash bounty | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-P5-3 | Deleted — no billing | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-P5-4 | Deleted — single-tenant | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-P5-5 | Deleted — raw xAPI archive sufficient | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-P5-6 | Deleted — no marketplace | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-P5-7 | Deleted — customers self-host | [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) |
| 2026-04-21 | OQ-X-7 (new) | Track Astro's Zod v4 adoption | [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md) |
| 2026-04-21 | OQ-X-8 (new) | Track Coolify cadence; fallback = vanilla Docker Compose | [ADR 0018](../adr/0018-coolify-on-hetzner-for-self-hosting-default.md) |

## Review cadence for this document

- **Weekly** at architecture review: any question with deadline in the next 14 days gets a status check.
- **Monthly** at ADR review: every `proposed` older than 14 days either promoted to `decided` or explicitly justified as `researching` with a new deadline.
- **Per phase gate**: every question with a deadline before the gate must be `decided` or explicitly `deferred` with a new deadline.
- **Deleted** items are never reopened without a superseding ADR.

## How to add a question

1. Append to the appropriate section.
2. Assign an owner (role name) and a deadline.
3. Describe the decision trigger — what real event forces the decision.
4. Link from the file(s) where the absence of the decision shows up.
5. Raise it at the next weekly architecture review.

Questions without owners are not "open" — they are invisible. Every question in this file must have a role-name owner. If no one will own it, delete it or defer it explicitly with a named owner and a later deadline.
