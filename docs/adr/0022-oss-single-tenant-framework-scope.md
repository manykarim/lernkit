---
status: accepted
date: 2026-04-21
deciders: core team
consulted: Many
informed: future engineering team
supersedes: portions of 0020
---
# 0022 — Scope Lernkit as an OSS single-tenant framework for producing conformant course packages

## Context and Problem Statement

The research document (§8 Phase 5) and the original phased plan anticipated an eventual enterprise / SaaS motion: multi-tenant data isolation, SSO for
enterprise IdPs, Stripe billing, a public course marketplace, customer-BI exports, and a managed EU-region LRS. Those items were carried into the plan
as Phase 5 scope.

Product direction is being re-anchored. **Lernkit is an OSS framework whose purpose is to produce conformant, feature-complete SCORM 1.2 / SCORM 2004 4th /
cmi5 / xAPI course packages with runnable code as a first-class primitive.** Everything downstream of "produce a great package" — multi-tenant hosting,
billing, marketplace, managed SaaS — is out of scope for this project. Customers who need those capabilities run Lernkit inside their own
infrastructure, or integrate its output into their own LMS.

This ADR captures that decision so future contributors do not relitigate it from the research document, and so feature requests in the deprecated
directions get a consistent response.

## Decision Drivers

- **Mission clarity.** The market gap the research identified is "executable code in lessons as a first-class primitive across conformant LMS
  packaging." That is the thing we are uniquely positioned to build well. Multi-tenant SaaS is a different product — plenty of tools exist for it and
  our small team is not the right builder.
- **Surface area.** Multi-tenancy, billing, and marketplace each carry multi-month engineering, security, and compliance costs (RLS, tax, GDPR DPIAs,
  moderation pipelines). Cutting them concentrates the same engineering capacity on packaging depth, standards conformance, and code-execution quality.
- **Operational posture.** The framework is designed for self-host on a single Coolify+Hetzner box per ADR 0018. Multi-tenant features would require a
  different operational substrate. Keeping scope to single-tenant keeps the deployment story honest and reproducible.
- **Dependency minimization.** No Stripe, no marketplace storage, no per-tenant data-isolation test matrix, no EU-region managed LRS SLA.
- **OSS community signal.** An MIT (ADR 0014) OSS framework with a clean single-tenant story is a comfortable adoption story for enterprises that
  embed, fork, or integrate. A project that is also trying to be a SaaS competitor to the same enterprises sends a mixed signal.

## Considered Options

- **A:** OSS single-tenant framework only. No hosted tier, no multi-tenant, no billing, no marketplace. Conformance is the flagship.
- **B:** OSS core + optional hosted SaaS tier post-Phase 4 (the research's original recommendation).
- **C:** OSS core + open-spec marketplace (non-commercial, community-moderated) but no SaaS.
- **D:** Dual-track: OSS core plus a commercial enterprise edition with SSO / multi-tenant.

## Decision Outcome

Chosen option: **A — OSS single-tenant framework only.**

### What is in scope

- **Authoring** — MDX + Markdoc content collections, Keystatic UI.
- **Packaging** — SCORM 1.2, SCORM 2004 4th Ed, cmi5, xAPI bundle, plain HTML. Deep fidelity: every tracker field, every manifest option, every
  sequencing control we can sensibly support.
- **Rendering** — Astro + Starlight static output with React islands for runnable widgets.
- **Runnable code** — Pyodide in-browser, Sandpack for JS demos, FastAPI + gVisor sandbox for server-side Python and Robot Framework, rf-mcp as the
  RF runner base.
- **Assessment** — the full quiz-type vocabulary, code challenges with auto-grading, xAPI emit for all interactions.
- **Self-hosted LRS** — Yet Analytics SQL LRS, shipped as part of the Coolify stack template.
- **Author analytics** — a local dashboard reading the self-hosted LRS, per-author / per-tenant-of-one.
- **Conformance** — SCORM Cloud in CI, per-LMS nightly smoke tests (Moodle + TalentLMS + Docebo + iSpring + SAP SuccessFactors), a public compatibility
  matrix as a living deliverable.
- **PDF export** — Paged.js + Playwright pipeline.
- **Accessibility** — WCAG 2.2 AA across author UI and learner UI.
- **Internationalization** — built-in, per-course.

### What is out of scope

These are **not** features of Lernkit; feature requests in these directions are closed with a reference to this ADR:

- Multi-tenant data isolation, RLS, schema-per-tenant, organization-level roles beyond `author` / `reviewer` / `learner`.
- Stripe billing, Stripe Tax, any revenue-collection machinery.
- Course marketplace (catalog, ratings, discovery, revenue share, moderation, takedown pipeline).
- Managed / hosted SaaS tier at any region.
- EU-region managed LRS offering (customers self-host).
- Customer-BI export beyond the raw xAPI archive the LRS already provides.
- Enterprise SSO as a product feature (an OIDC adapter that customers wire to their own IdP is in scope; vendor-specific connectors are not).
- Pen-test / bug-bounty programs scaled to enterprise SLA (we keep a credit-only disclosure program).

### Consequences

- **Functionality, sharpened:** scope concentrates on the conformance + runnable-code differentiator.
- **Clarity, good:** contributors, users, and future hires get a crisp one-line answer to "what is Lernkit?"
- **Security, good:** single-tenant substrate reduces the authorization-layer surface materially. Multi-tenant isolation bugs cannot exist in code we
  do not write.
- **Cost, good:** no Stripe, no tax vendor, no marketplace hosting, no managed-LRS SLA.
- **Adoption, mixed:** customers who wanted a hosted tier will go elsewhere or host themselves. We accept this; the OSS + self-host path is a real
  option for anyone who wants it.
- **Testability, good:** the Phase 5 success metric becomes observable in CI (conformance across N LMSes) instead of a sales outcome.
- **Portability, mixed:** we do not validate the framework against multi-tenant SaaS deployment patterns. That is acceptable since we are not asking
  anyone to run it that way.

## Pros and Cons of the Options

### A — OSS single-tenant framework only — chosen

- Good: tightest scope, cleanest mission.
- Good: aligns with ADR 0018 (single-box) and ADR 0021 (self-host-first) operationally.
- Good: Phase 5 success metric becomes an engineering goal (conformance coverage) instead of a sales goal.
- Bad: forecloses a revenue motion that might otherwise fund development.

### B — OSS core + optional hosted tier

- Good: best-of-both on paper.
- Bad: splits attention; the minimum viable hosted tier is months of work (billing, auth, rate-limiting, tenant isolation, support).
- Bad: a small team running both ends up under-serving both.

### C — OSS core + community marketplace

- Good: community growth vector.
- Bad: moderation and infra cost for a handful of wins at our scale; legal posture on user-contributed content gets real fast.

### D — Dual-track OSS + commercial enterprise edition

- Good: classic sustainable-OSS pattern.
- Bad: creates a permanent divergence and a support burden we cannot staff at current size.

## Validation

- **Scope tests.** Every new feature PR references this ADR and confirms scope fit. PRs implementing out-of-scope features are closed with a reference
  to this ADR.
- **Phase-5 success metric rewrite.** `docs/plan/02-phase-plan.md` replaces the enterprise-pilot success metric with a conformance-coverage metric:
  every package produced by Lernkit imports and runs correctly on SCORM Cloud + Moodle + TalentLMS + Docebo + iSpring Learn + SAP SuccessFactors (for
  2004), with full feature and statement fidelity, verified by the nightly conformance suite.
- **Roadmap hygiene.** `docs/plan/10-open-questions.md` has closed-as-deleted the hosted-SaaS, marketplace, multi-tenant, billing, and enterprise-pilot
  questions. Future open questions in those directions get the same treatment with a pointer to this ADR.

## Closed questions this ADR retires

From `docs/plan/10-open-questions.md`:

- OQ-R-2 (hosted SaaS tier) — deleted.
- OQ-R-3 (marketplace governance) — deleted.
- OQ-P1-3 (anchor enterprise customer) — deleted; replaced by conformance-coverage metric.
- OQ-P5-1 through OQ-P5-7 — reshaped: bug-bounty becomes credit-only self-managed; Stripe Tax deleted; multi-tenant deleted; customer-BI export
  deleted; marketplace deleted; EU-region managed LRS deleted. OQ-R-4 (ADL SCORM Certified) remains, reframed as a technical-validation question,
  deferred past P5.

Out-of-scope features that are reopened later require a **superseding ADR** explicitly reversing this one.

## More Information

- Research §8 "Phased implementation plan" — Phase 5 as originally written, retained only for historical context.
- Research §9 "Open questions" — the hosted SaaS / marketplace / certification questions this ADR closes.
- ADR 0014 — MIT license (consistent with the OSS-only posture here).
- ADR 0018 — Coolify + Hetzner single-box deployment (operational match).
- ADR 0020 — Defer list (this ADR supersedes the multi-tenant SaaS deferral by making it a hard out-of-scope).
- ADR 0021 — Self-host-first infrastructure principle (consistent operational stance).
- `docs/plan/PRODUCT-SHAPE.md` — one-page product-shape statement for new contributors.
