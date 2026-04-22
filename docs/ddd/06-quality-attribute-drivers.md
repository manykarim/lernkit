# 06 — Quality Attribute Drivers per Context

Which context is *primarily accountable* for each cross-cutting quality attribute. "Accountable" means: when this attribute is violated, that context's team fixes it, even if the root cause is elsewhere. Contexts link to their [context models](./03-context-models/). Research citations "§N" refer to [`compass_artifact_...md`](../research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md).

## Summary table

| Attribute | Primary owner | Secondary owners |
|---|---|---|
| **Functionality** | [Authoring](./03-context-models/authoring.md) | all other core contexts |
| **Usability (author DX)** | [Authoring](./03-context-models/authoring.md), [Authoring UI](./03-context-models/authoring-ui.md) | [Content Rendering](./03-context-models/content-rendering.md) |
| **Usability (learner UX)** | [Content Rendering](./03-context-models/content-rendering.md) | [Code Execution](./03-context-models/code-execution.md), [Learner Progress](./03-context-models/learner-progress.md) |
| **Performance (cold start)** | [Content Rendering](./03-context-models/content-rendering.md), [Code Execution](./03-context-models/code-execution.md) | [Packaging](./03-context-models/packaging.md) |
| **Performance (steady-state)** | [Code Execution](./03-context-models/code-execution.md), [RF Execution](./03-context-models/robot-framework-execution.md) | [Tracking](./03-context-models/tracking.md) |
| **Security** | [Code Execution](./03-context-models/code-execution.md), [RF Execution](./03-context-models/robot-framework-execution.md) | [Identity & Tenancy](./03-context-models/identity-tenancy.md), [LMS Launch](./03-context-models/lms-launch.md) |
| **Portability (LMS quirks)** | [Packaging](./03-context-models/packaging.md), [LMS Launch](./03-context-models/lms-launch.md) | [Tracking](./03-context-models/tracking.md) |
| **Portability (offline/print)** | [PDF Rendering](./03-context-models/pdf-rendering.md) | [Content Rendering](./03-context-models/content-rendering.md) |
| **Testability** | [Authoring](./03-context-models/authoring.md) | [Packaging](./03-context-models/packaging.md), [Tracking](./03-context-models/tracking.md) |
| **Clarity (author-facing)** | [Authoring](./03-context-models/authoring.md) | [Authoring UI](./03-context-models/authoring-ui.md) |
| **Data durability / correctness** | [Learner Progress](./03-context-models/learner-progress.md), [Tracking](./03-context-models/tracking.md) | [LMS Launch](./03-context-models/lms-launch.md) |
| **Observability** | Observability (generic) | all |

---

## Functionality

Lernkit's functional surface is measured against the Tier 1 / Tier 2 interaction vocabulary (Research §1.1, §1.4). The owner of *every* functional gap is [Authoring](./03-context-models/authoring.md) because the gap is always "we don't have a Component for X." Downstream contexts may be the *site* of the gap ([Code Execution](./03-context-models/code-execution.md) if runnable JS is missing; [Packaging](./03-context-models/packaging.md) if an export format is missing) but the Component catalog in Authoring is where the audit happens.

## Usability — author DX

Author DX is the clarity of writing MDX with `<Quiz>`, `<RunnablePython>`, `<Scenario>` etc. Research §10.8 flags this explicitly: "Raw MDX is intimidating; a typo in a component prop breaks the build." Owned by [Authoring](./03-context-models/authoring.md) (Zod schemas, typed component registry, build-time diagnostics) and [Authoring UI](./03-context-models/authoring-ui.md) (Keystatic's schema-driven forms). Markdoc is a secondary surface for author-safe content (Research §2.3 bonus pattern).

## Usability — learner UX

Learner UX is rendering smoothness (island hydration timing), offline/mobile tolerance, accessibility (WCAG 2.2 AA — Research §8 Phase 3 accessibility pass), and bundle size per route. Primarily [Content Rendering](./03-context-models/content-rendering.md)'s budget (Islands, BundleBudget VO), with [Code Execution](./03-context-models/code-execution.md) owning the Pyodide skeleton-loader UX (Research §10.6). [Learner Progress](./03-context-models/learner-progress.md) owns resume correctness across devices.

## Performance — cold start

The primary cold-start penalty is the first Pyodide load (6–10 MB wasm, 10–30 s on a slow link — Research §10.6). Mitigation is split across:

- [Content Rendering](./03-context-models/content-rendering.md) — Service Worker pre-cache on course enter, `<link rel="preload">` for the wasm.
- [Code Execution](./03-context-models/code-execution.md) — defer Pyodide until first `Run` click; cache with `immutable` + version-in-URL.
- [Packaging](./03-context-models/packaging.md) — for SCORM zips, make Pyodide bundling opt-in (per-course toggle) because it's the dominant zip-size contributor.

## Performance — steady-state

Per-execution latency, throughput of the Runner pool, streaming frame latency. Owned by [Code Execution](./03-context-models/code-execution.md) (WarmPool, Quota pre-check, SSE batching) and [RF Execution](./03-context-models/robot-framework-execution.md). [Tracking](./03-context-models/tracking.md) owns xAPI statement throughput via StatementBatch VO — bounded by the 250 ms / 32-statement flush policy (Research §10.10).

## Security

The single highest-risk surface is untrusted code execution (Research §10.3). Owners:

- [Code Execution](./03-context-models/code-execution.md) — gVisor runsc enforcement, seccomp profile validity, wall-clock Timeout, per-user Quota, container scanning in CI (Research §4.3 hardening checklist).
- [RF Execution](./03-context-models/robot-framework-execution.md) — same checklist plus the `log.html` isolated-origin invariant and the `rf-mcp-vnc` tighter-isolation profile (Research §4.4).
- [Identity & Tenancy](./03-context-models/identity-tenancy.md) — OIDC + RLS enforcement, impersonation audit.
- [LMS Launch](./03-context-models/lms-launch.md) — LRS credential containment; browser never holds them (Research §4.5).

Security failures in this system are existential — a single missed `--network=none` can exfiltrate learner data or pivot to infra. Every Sandbox configuration change must have paired regression tests.

## Portability — LMS quirks

SCORM 1.2 vs 2004 2nd/3rd/4th Ed vs cmi5 vs xAPI, plus per-LMS bugs (Moodle incomplete 2004, SAP SuccessFactors weird 2nd-and-4th-not-3rd, TalentLMS 1.2 only, Cornerstone drops interactions — Research §3.3). Owned by:

- [Packaging](./03-context-models/packaging.md) — the builder per PackageKind, ZipLayout invariants, AssetRewrite.
- [LMS Launch](./03-context-models/lms-launch.md) — LmsAdapter registry, inbound normalization of quirks.
- [Tracking](./03-context-models/tracking.md) — the five Adapters doing the per-spec dispatch.

Operational rule: every package goes through SCORM Cloud CI before release (§3.3). This is the Packaging-owned gate.

## Portability — offline and print

Packages must render on offline/airgapped LMSes; PDFs must be book-quality. [PDF Rendering](./03-context-models/pdf-rendering.md) owns the latter (Paged.js + Playwright, Research §5). [Content Rendering](./03-context-models/content-rendering.md) owns PrerenderedSvg for diagrams (no runtime Mermaid fetch) and the `@media print` fallback per Island.

## Testability

Lernkit tests against itself using Robot Framework (Research §7 testing stack — a self-referential choice). Test surfaces:

- Frontmatter schema and component props — [Authoring](./03-context-models/authoring.md) build-time Zod validation.
- Zip layout correctness — [Packaging](./03-context-models/packaging.md) unit tests against assembled zips, plus SCORM Cloud CI.
- Adapter behavior — [Tracking](./03-context-models/tracking.md) has per-Adapter test suites against mocked LMS APIs.
- E2E — `robotframework-browser` (Playwright-based) exercises authoring → build → run → grade → resume.

## Clarity — author-facing

Clarity is the delta between what an author *writes* and what appears in the build error log. Owned by [Authoring](./03-context-models/authoring.md): validation messages must name the exact file, line, and field. Secondary: [Authoring UI](./03-context-models/authoring-ui.md) surfaces these inline in the editor (Research §8 Phase 4 `SchemaValidationFailed` event).

## Data durability / correctness

Resume state, Attempt history, Enrollment completion. Owned by [Learner Progress](./03-context-models/learner-progress.md) (append-only ledger, `MirroredSuspendData` overflow for SCORM 1.2) and [Tracking](./03-context-models/tracking.md) (ActivityId stability invariant). [LMS Launch](./03-context-models/lms-launch.md) owns LRS-bound delivery guarantees (batch retry).

## Observability

OTel + Loki + Tempo + Sentry (Research §7), cutting across every context. Every context emits TraceId-tagged events; the Statement ACL round-trips TraceId as an xAPI context extension for end-to-end correlation from a browser run-click through FastAPI → Sandbox → LRS.

---

## Per-attribute narrative

### Author DX is won or lost in Authoring

If the Zod schema rejects a lesson with "TypeError at line 42", the author gives up. If it says "Lesson `loops.mdx` line 5: `masteryScore` must be in [0, 1], got 1.5", the author fixes it. [Authoring](./03-context-models/authoring.md) owns the quality of that message.

### Learner UX is won or lost in Content Rendering and Pyodide cold start

A prose-only page must ship zero JS (Astro islands — Research §2.2); a Pyodide-heavy page must preload intelligently (Research §10.6). Everything else is polish on top of those two numbers.

### Security is won or lost in Code Execution's hardening checklist

Every other security concern is routine. Sandbox misconfiguration is the one with a critical blast radius; all other contexts defer to [Code Execution](./03-context-models/code-execution.md)'s and [RF Execution](./03-context-models/robot-framework-execution.md)'s discipline (Research §4.3).

### Portability is won or lost in Packaging's LMS-quirk catalog

SCORM 1.2 gets a `schemaversion 1.2` string and a 4 KB suspend_data cap; SCORM 2004 4th Ed gets 64 KB; cmi5 allows absolute URLs. Each of these is a Packaging decision. If a customer's LMS fails, [Packaging](./03-context-models/packaging.md) is the first place to look.

### Testability is won or lost in Authoring's schema rigor plus SCORM Cloud CI

Schemas catch typos at build; SCORM Cloud catches spec drift at release. Nothing between those two gates can hide.

### Clarity is won or lost in error message authorship

Every validation failure must name the file, the line, the field, the violated rule, and a link to an actionable doc. This is cheap to do well and catastrophic to do badly.

### Data durability is won or lost in the append-only ledger

Server-held progress is append-only; LMS-held progress is authoritative where it exists. Reconciliation rules in [Learner Progress](./03-context-models/learner-progress.md) make this predictable.
