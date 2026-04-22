---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0020 — Defer WebContainers default, Scrim, course marketplace, AI authoring, multi-tenant SaaS

## Context and Problem Statement

Ambitious frameworks die of scope creep. The research identifies several features that are real product value but are either (a) economically inappropriate
for the default tier, (b) execution-risky before the core product lands, or (c) dependent on infrastructure we have not built yet. This ADR makes those
deferrals explicit so engineers can confidently say "not yet" when a feature is proposed too early.

## Decision Drivers

- **Focus.** The 9–12 month roadmap (research §8) already has 52 weeks of scope for 2–3 engineers; every item added pushes the release or reduces quality.
- **Economic fit.** Some features require commercial licenses that do not fit the open-source default tier.
- **Prerequisite ordering.** Advanced features depend on stable core primitives; shipping them before the core is solid wastes integration rework.
- **Market evidence.** Commercial differentiators should land after the core product has real users, not speculatively.

## Considered Options

For each deferred item we had options ranging from "ship in v1" to "skip forever". This ADR records the chosen option ("defer to Phase X" or "ship only as a
paid / customer-provided tier") and the concrete trigger that unblocks promotion.

## Decision Outcome

The following items are **explicitly deferred** or **scoped to paid tiers**. Each has a revisit trigger — a concrete observable fact that would move the
item forward.

### 1. WebContainers as the default in-browser JS runtime

**Defer to: paid / customer-licensed tier only.**

- **Why:** StackBlitz WebContainers requires a commercial enterprise license (5-figure USD/year per research §4.2 and §10 Risk #4). An open-source default
  cannot impose this.
- **What we ship instead:** Sandpack (Apache 2.0) for component demos + sandboxed iframe for snippets (ADR 0007). FastAPI server runner for full Node
  workloads.
- **Revisit trigger:** (a) StackBlitz offers WebContainers under a permissive OSS license (unlikely), or (b) a customer provides their own
  WebContainers license key and opts into the `<RunnableJS mode="webcontainer">` component (already wired in ADR 0007).

### 2. `<Scrim>` interactive screencast recorder + player

**Defer to: Phase 4 (v1) minimum-viable version.**

- **Why:** Scrimba's "player-is-the-IDE" UX is a #1 differentiator in code-focused learning (research §1.3) but needs stable CodeMirror 6 integration
  (ADR 0010), a stable Tracker interface (ADR 0004), and a persistent per-lesson state layer. All land in Phase 2–3; Scrim in Phase 4 ships on top.
- **What v1 looks like:** editor keystroke recorder + audio + "run at any timestamp" fork. No video compositing, no overdub editing — those are v2+.
- **Revisit trigger:** Phase 3 deliverables land with no more than minor bugs; two engineer-weeks of Scrim research have produced a working prototype on a
  branch.

### 3. Public course marketplace

**Defer to: Phase 5 at earliest, policy decisions required before building.**

- **Why:** content governance, moderation, payments, takedown flows, and runner cost attribution for popular courses are policy questions, not engineering
  questions. Research §10 explicitly flags this as needing an answer before building.
- **Open questions that must be resolved first:**
  - Who moderates content?
  - How are runtime / infra costs for popular courses funded (tenants pay per-execution, sponsored courses, ads)?
  - What is the DMCA / takedown workflow?
  - Does the marketplace host commercial courses, free courses, or both?
- **Revisit trigger:** (a) 5+ paying customers ask for cross-tenant course discovery, or (b) we decide to launch a hosted SaaS tier (which is itself
  deferred — see item 5).

### 4. AI authoring assist

**Defer to: Phase 4+, BYO-API-key pattern.**

- **Why:** every commercial incumbent (EasyGenerator EasyAI, Captivate prompt-to-slide, Articulate AI Assistant) ships AI course generation. A code-first
  framework with MDX source is unusually well-suited for LLM output (research §10 open questions). But:
  - We should not build this before the MDX component palette is stable.
  - BYO-API-key keeps us out of AI-provider commercial risk.
  - Markdoc (ADR 0012) is the better target for AI-generated content than full MDX — tag constraint = safer output.
- **What v1 looks like:** a Keystatic plugin that prompts an LLM (via the author's own API key) to draft a lesson skeleton in Markdoc; author reviews and
  edits before merge.
- **Revisit trigger:** Phase 4 Keystatic integration is stable; Markdoc content zones are in production use; two authors have independently requested
  AI-draft workflow.

### 5. Hosted SaaS tier

**Defer to: post-Phase 4 optional commercial offering.**

- **Why:** OSS + self-hosted on Coolify + Hetzner is the default (ADR 0018). A hosted tier adds billing, multi-tenant auth (OIDC SSO from Phase 5),
  tenant-level data isolation, per-tenant LRS, and SLA obligations. The engineering scope is months.
- **What we ship in the core:** MIT OSS core (ADR 0014). Customers self-host.
- **Revisit trigger:** (a) OSS user base clearly demands "just pay someone to run it", or (b) revenue expectations of the project require it.

### 6. Kubernetes / multi-tenant infrastructure

**Defer until the specific multi-tenant triggers in ADR 0018 fire.**

- **Why:** K8s operator overhead is unjustified at single-tenant scale.
- **Revisit trigger:** research §Phase 5 items — multi-tenant data isolation, OIDC SSO, organization-level roles, billing integration, course marketplace.

### 7. Firecracker sandbox promotion

**Defer to: the first multi-tenant customer running untrusted RF browser lessons at non-trivial volume.**

- **Why:** gVisor is sufficient for single-tenant and trusted-tenant use (ADR 0008). Firecracker's microVM isolation is the next-tier upgrade, at 2–3×
  runner cost.
- **Revisit trigger:** one of:
  - Multi-tenant course marketplace launches (item 3).
  - gVisor CVEs require patching too frequently to operate reliably.
  - Customer contractually requires hardware-isolated execution.

### 8. SCORM Certified status from ADL

**Defer indefinitely.**

- **Why:** SCORM Cloud conformance (ADR 0017) is the de-facto industry reference and sufficient for every customer procurement conversation we have seen.
  Official ADL certification is expensive and slow.
- **Revisit trigger:** a major customer's RFP requires formal ADL SCORM Certified status.

### 9. SCORM 2004 2nd and 3rd Editions

**Skipped.** (Documented here for completeness; the decision was made in ADR 0003.)

- **Why:** a 2004 4th Ed package usually works in 3rd Ed LMSes with a `schemaversion` swap. 2nd Ed has essentially no remaining LMS demand.
- **Revisit trigger:** a customer's LMS demonstrably fails on the `schemaversion` swap workaround and they cannot move.

### 10. Monaco editor by default

**Scoped to a dedicated `/ide/*` page only.** (ADR 0010.)

- **Why:** 2–5 MB bundle size vs CodeMirror 6's 120–300 KB — would blow up SCORM payload.
- **Revisit trigger:** unlikely; this is a size-ceiling decision.

### Consequences

- **Clarity, good:** future authors and engineers can point to this ADR and say "not now" with confidence.
- **Clarity, good:** each item has a specific trigger — the deferral is not open-ended.
- **Usability, neutral:** some users will ask for the deferred features; we have clear "here is the path" answers.
- **Testability, good:** the things we *don't* build don't need test coverage — every engineer-week saved goes to the core.
- **Security, good:** by not building multi-tenant / marketplace prematurely we avoid the data-isolation and content-moderation risks those features carry.

## Pros and Cons of Deferring vs Shipping

Each item's individual pros/cons are captured above. The aggregate trade-off:

### Pros of explicit deferral (this ADR)

- Each deferred item has a concrete revisit trigger — we are not saying "never".
- Forces discussion at the moment of promotion, not at the moment of ambiguity.
- Protects core-product scope from accumulating speculative features.

### Cons

- Some users will want items that are deferred — response is to point them at the ADR and ask if their need meets a trigger.
- A deferral is only as good as the discipline to honor it; code review must push back on PRs that effectively ship a deferred feature.

## Validation

- **Quarterly review:** the ADR is re-read at each quarterly planning session; triggers are checked; items promoted to a roadmap epic if trigger fires.
- **PR-template cross-reference:** the PR template asks whether the change advances a deferred item, and if so, links to this ADR.
- **ADR supersession discipline:** when any item is promoted (e.g. AI authoring ships in Phase 4), a new ADR supersedes the relevant section of this one so
  the historical context stays preserved (see ADR 0001 lifecycle rules).

## More Information

- Research §4.2, §10 Risk #4 (WebContainers licensing).
- Research §1.3 and §8 Phase 4 (Scrim).
- Research §10 open questions (marketplace, AI authoring, SaaS tier).
- Research §8 Phase 5 (multi-tenant, SSO, marketplace).
- Research §4.3 (Firecracker upgrade path).
- Related ADRs: 0003 (SCORM 2nd/3rd Ed skip), 0007 (WebContainers as paid tier), 0010 (Monaco scoped), 0018 (multi-tenant infra trigger).
- Open question: do we maintain a separate ROADMAP.md document, or is this ADR + the quarterly planning notes enough? Current answer: this ADR + quarterly
  notes; promote to ROADMAP.md if the list grows beyond ~15 items.
