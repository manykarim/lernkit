# Lernkit — Implementation Plan

> Execution-ready expansion of the research document's §8 phased plan. Primary source: [`../research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md`](../research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md) (cited as "Research §N" throughout).

> **Product shape:** [`PRODUCT-SHAPE.md`](./PRODUCT-SHAPE.md) is the one-page anchor for what Lernkit is and is not. Read it before proposing scope expansions.
>
> **Related ADRs:** [ADR 0014](../adr/0014-mit-license-for-framework-core.md) (MIT license), [ADR 0018](../adr/0018-coolify-on-hetzner-for-self-hosting-default.md) (Coolify + Hetzner default), [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md) (self-host-first infrastructure), [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) (OSS single-tenant scope — no hosted SaaS, no multi-tenant, no marketplace, no billing).

This directory is the single operational source of truth for *how* Lernkit gets built. The research document is the *why*; the ADRs (see [`../adr/README.md`](../adr/README.md)) capture individually reviewed architectural commitments; the DDD docs (see [`../ddd/README.md`](../ddd/README.md)) define the bounded contexts and ubiquitous language. The plan docs below stitch those three layers together across 52 calendar weeks of scope.

Plan start date: **2026-04-20** (today). Phase 0 exit target: **2026-05-11**. Phase 5 exit target: **2027-04-19**.

## How to read this plan

Read in order if you are new:

1. [`00-quality-attribute-goals.md`](./00-quality-attribute-goals.md) — the seven quality attributes with numeric targets. Every other file refers back to these.
2. [`01-workstreams-and-dependencies.md`](./01-workstreams-and-dependencies.md) — the 18 parallel workstreams, with a Mermaid dependency graph.
3. [`02-phase-plan.md`](./02-phase-plan.md) — the six phases with calendar weeks, FTE allocation, exit gates, pre-mortems, and rollback options.
4. [`03-test-strategy.md`](./03-test-strategy.md) — the test pyramid and conformance gates.
5. [`04-risk-register.md`](./04-risk-register.md) — 22 tracked risks with owners and review cadence.
6. [`05-security-model.md`](./05-security-model.md) — trust boundaries, STRIDE, sandbox hardening.
7. [`06-observability-plan.md`](./06-observability-plan.md) — OTel traces, SLIs/SLOs, dashboards, alerts.
8. [`07-ci-cd-pipeline.md`](./07-ci-cd-pipeline.md) — the GitHub Actions pipeline end-to-end.
9. [`08-team-and-raci.md`](./08-team-and-raci.md) — team shape, RACI, hiring triggers.
10. [`09-dependency-governance.md`](./09-dependency-governance.md) — license allow-list, vendoring policy, supply-chain posture.
11. [`10-open-questions.md`](./10-open-questions.md) — open decisions with owners and deadlines.

Navigate sideways when you need to: every cross-reference uses relative links.

## Relationship to ADRs and DDD docs

- An **ADR** is the durable record of a single architecturally-significant decision. The plan *refers to* ADRs by ID (e.g. "per ADR 0008 the sandbox hardening checklist is X") but does not duplicate the reasoning.
- A **DDD context model** is the durable description of a single bounded context's aggregates, ubiquitous language, and integration patterns. The plan refers to contexts by name (e.g. "WS-G delivers the *Code Execution* context").
- The **plan** is the time-boxed, owner-bearing, testable version. It decays fastest and gets rewritten every quarter at the monthly architecture review.

ADRs referenced in this plan (canonical index: [`../adr/README.md`](../adr/README.md)):

| ID | Topic |
|---|---|
| 0001 | Use MADR 3.0 for architecture decisions |
| 0002 | Adopt Astro 5 + Starlight + MDX + React islands |
| 0003 | Prioritize cmi5 + SCORM 1.2 with SCORM 2004 4th Ed opt-in |
| 0004 | Unify tracking behind a single Tracker interface with pluggable adapters |
| 0005 | Use scorm-again as the primary SCORM 1.2 / 2004 runtime wrapper |
| 0006 | Run in-browser Python on Pyodide 0.29.x inside a Web Worker, self-hosted |
| 0007 | Use Sandpack for browser JS demos; defer WebContainers to a paid tier |
| 0008 | Execute server-side code on FastAPI + Docker with gVisor |
| 0009 | Reuse `ghcr.io/manykarim/rf-mcp` as the Robot Framework runner base |
| 0010 | Use CodeMirror 6 as the primary in-lesson editor |
| 0011 | Use Paged.js + Playwright Chromium for PDF export |
| 0012 | Use Keystatic as the primary UI authoring layer |
| 0013 | Use Yet Analytics SQL LRS as the self-hosted LRS |
| 0014 | License the framework core under MIT |
| 0015 | Build one static source into many standards-packaged outputs |
| 0016 | Embed H5P via h5p-standalone for long-tail content |
| 0017 | Test the framework itself with Robot Framework |
| 0018 | Run the default self-hosted deployment on Coolify + Hetzner dedicated |
| 0019 | Scope cross-origin isolation headers (COOP/COEP) to the runner page only |
| 0020 | Defer WebContainers default, Scrim, marketplace, AI authoring, multi-tenant SaaS |
| 0021 | Self-host every infrastructure dependency that is practical to self-host |
| 0022 | Scope Lernkit as an OSS single-tenant framework for producing conformant course packages |

Bounded contexts referenced in this plan (see [`../ddd/00-strategic-overview.md`](../ddd/00-strategic-overview.md)): *Authoring*, *Content Rendering*, *Code Execution*, *Robot Framework Execution*, *Assessment & Grading*, *Packaging & Export*, *Tracking*, *Learner Progress*, *PDF Rendering*, *LMS Launch / LRS Gateway*, *Authoring UI*, *Identity* (scope narrowed 2026-04-21 per ADR 0022 — single-tenant, no `Tenancy` model).

## Table of phases at a glance

| Phase | Weeks | Calendar | FTE-weeks | Exit criteria (abbreviated — full list in [`02-phase-plan.md`](./02-phase-plan.md)) |
|---|---|---|---|---|
| **P0** Foundation | 1–3 | 2026-04-20 → 2026-05-11 | 7.5 | Monorepo, CI green, Coolify staging deploys on every merge, ADRs 0001–0013 in `accepted` status. |
| **P1** MVP (HTML + SCORM 1.2) | 4–12 | 2026-05-11 → 2026-07-13 | 22.5 | Sample course imports cleanly into Moodle, TalentLMS, SCORM Cloud; xAPI stub adapter emits for quiz events. |
| **P2** Runnable Python + quizzes + PDF | 13–20 | 2026-07-13 → 2026-09-07 | 20 | 10-cell Python lesson cold-loads <3 s on warm cache; print PDF passes Playwright visual-regression baseline. |
| **P3** Runnable JS + RF + cmi5 + xAPI + advanced | 21–32 | 2026-09-07 → 2026-11-30 | 30 | End-to-end RF lesson works in Docebo; cmi5 round-trips through SCORM Cloud; WCAG 2.2 AA audit pass. |
| **P4** UI authoring + LRS analytics | 33–40 | 2026-11-30 → 2027-01-25 | 20 | Non-dev author ships a lesson via Keystatic; author dashboard reads LRS with ≤5 s statement-to-display latency. |
| **P5** Conformance & Polish | 41–52 | 2027-01-25 → 2027-04-19 | 30 | Every SCORM 1.2 / 2004 4th / cmi5 / xAPI package imports correctly across SCORM Cloud + 5 LMSes, with 100% interactive widget state + 100% quiz-type xAPI statement coverage, verified nightly. (Scope narrowed 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md).) |

Total in-plan engineering effort: **130 FTE-weeks** over **52 calendar weeks**, consistent with two senior full-stack engineers full-time plus Many fractional (~40 FTE-weeks/quarter — see [`08-team-and-raci.md`](./08-team-and-raci.md)).

## Cross-cutting conventions

- **Dates** are absolute (ISO-8601 `YYYY-MM-DD`). No relative "next quarter" references.
- **Numbers** are numeric targets with a source — either Research §N or a plan file with measurement method.
- **Owners** are role names (e.g. "FE-1", "BE-1", "Many") not individual names, so the plan survives personnel changes.
- **Status lifecycle** for any trackable item: `proposed → in-progress → done | blocked | deferred | dropped`.
- **Mermaid diagrams** render natively on GitHub and in Starlight; do not embed PNG screenshots.

## Living-document policy

- Review cadence: **monthly** architecture review updates [`04-risk-register.md`](./04-risk-register.md), [`10-open-questions.md`](./10-open-questions.md), and the phase tracker in [`02-phase-plan.md`](./02-phase-plan.md).
- **Quarterly** re-plan: [`01-workstreams-and-dependencies.md`](./01-workstreams-and-dependencies.md) is rewritten every 13 weeks based on what shipped.
- Any decision that materially changes the numeric targets in [`00-quality-attribute-goals.md`](./00-quality-attribute-goals.md) requires a new ADR, not an edit.

## Planning assumptions (areas where the research was silent)

These were assumed during planning; each is tracked in [`10-open-questions.md`](./10-open-questions.md) for explicit confirmation:

1. **Calendar start date 2026-04-20** — the research gave week numbers, not dates.
2. **FTE allocation per workstream per phase** — research gave totals; allocation is new. **Ratified 2026-04-21** alongside ADR 0022; FTE ratios are now a phase-plan commitment, not an open assumption.
3. **RACI roles "FE-1 / FE-2 / BE-1 / Many / ACC / SEC / ID"** — research named "two senior full-stack + Many fractional" only. **Ratified 2026-04-21** alongside ADR 0022 (scope-narrowing drops the dedicated SEC-from-P5 hire; security duties stay distributed across FE-1/BE-1/Many).
4. **SLIs/SLOs** (e.g. /exec p99 <1 s at warm pool) — research gave cost and latency ranges but not SLO targets.
5. **Disclosure program** — **credit-only disclosure program via `SECURITY.md`; no bug-bounty platform subscription.** (Scope narrowed 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md).)
6. **License allow-list (MIT/Apache 2.0/BSD/ISC/MPL 2.0)** — research called out AGPL concerns only; the allow-list is new.
7. **Hiring triggers tied to phases 4/5** — research said "additional hiring or longer calendar"; specific roles and timing are new.
8. **Alerting tool choice (PagerDuty/email)** — research mentioned OTel + Grafana + error-tracking but not alert routing. Self-host-first 2026-04-21 per [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md): error tracking is GlitchTip self-hosted.
9. **Quarterly pen-test cadence starting end of Phase 3** — research mentioned bug bounty only.
10. **Specific Lighthouse/Core Web Vitals numeric budgets** — derived from Google's 2024 "good" thresholds, not quoted directly.
