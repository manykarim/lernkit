---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0004 — Unify tracking behind a single Tracker interface with pluggable adapters

## Context and Problem Statement

The framework publishes to five output formats (SCORM 1.2, SCORM 2004 4th Ed, cmi5, raw xAPI, plain HTML — see ADR 0003 and ADR 0015). Each format has a
different runtime API:

- SCORM 1.2 / 2004 expose a synchronous JavaScript `API` / `API_1484_11` object on the parent iframe chain with `LMSInitialize`, `LMSGetValue`, `LMSSetValue`,
  `LMSCommit`, `LMSFinish` (or the 2004-era un-prefixed equivalents).
- cmi5 uses xAPI 2.0 REST calls over HTTPS with `launched` / `initialized` / `terminated` statement bookends plus cmi5-specific `moveOn` rules and
  `AU.masteryScore`.
- Raw xAPI is statements-only with no session bookends beyond those we define.
- Plain HTML has no LMS to report to.

A component like `<MCQ>` or `<RunnablePython>` must not know which target the course will be packaged for — otherwise every component bakes five code paths
and conditional logic bloats every build.

## Decision Drivers

- **One component, five outputs.** Authors write `<Quiz>` once; the build chooses the adapter.
- **Type safety.** The TypeScript type system should prevent a component from calling a tracking method that does not exist.
- **Bundle size.** Only the selected adapter ships in each package — no dead code for unused standards.
- **Testability.** A `NoopAdapter` lets components be unit-tested without a live LMS.
- **Evolvability.** Adding a new standard (e.g. SCORM 2004 2nd Ed for a specific customer, or future xAPI 2.1) means writing one adapter, not touching
  components.

## Considered Options

- **A:** One `Tracker` TypeScript interface; five adapters; build-time injection via a small DI container.
- **B:** Runtime detection — components probe `window.API` / `window.API_1484_11` / cmi5 launch params and branch per call.
- **C:** Separate component variants (`<MCQScorm12>`, `<MCQCmi5>`, `<MCQXapi>`).
- **D:** Write against scorm-again directly; skip the abstraction.

## Decision Outcome

Chosen option: **A — single `Tracker` TypeScript interface with pluggable adapters selected at build time.** Components import the interface only, never a
concrete adapter. The packager wires the correct adapter into `dist/` when building each output format.

### The `Tracker` interface

```ts
export interface Tracker {
  init(ctx: TrackerContext): Promise<void>;
  setProgress(fraction: number): void;            // 0..1
  setBookmark(state: string): void;               // opaque blob, size-capped per adapter
  recordInteraction(interaction: Interaction): void;
  setScore(scaled: number, raw?: number, min?: number, max?: number): void;
  complete(): void;                               // completion_status = completed
  pass(): void;                                   // success_status = passed (2004); lesson_status = passed (1.2)
  fail(): void;                                   // success_status = failed (2004); lesson_status = failed (1.2)
  terminate(): Promise<void>;                     // commits + finalizes
}
```

### The five adapters

- `ScormAgainAdapter12` — wraps scorm-again's 1.2 API; serializes bookmarks under the 4,096-char `cmi.suspend_data` cap; merges `complete()`/`pass()` into the
  single `lesson_status` field (SCORM 1.2 quirk from ADR 0003).
- `ScormAgainAdapter2004` — wraps scorm-again's 2004 API; writes `cmi.completion_status` and `cmi.success_status` independently; uses ISO-8601 for
  `session_time`.
- `Cmi5Adapter` — built on `@xapi/cmi5`; emits `launched`/`initialized`/`terminated` bookends; honors `AU.masteryScore` and cmi5 `moveOn` rules.
- `XapiAdapter` — built on `@xapi/xapi`; statements-only; session bookends are framework-defined (`initialized`/`terminated`).
- `NoopAdapter` — records to an in-memory log; used for `plain-html` packages, unit tests, and Storybook.

### Consequences

- **Clarity, good:** component code stays target-agnostic; the standards complexity is quarantined in five files.
- **Testability, good:** `NoopAdapter` is trivial to swap in for unit tests and preview builds.
- **Portability, good:** adding SCORM 2004 3rd Ed or AICC later is one new adapter, not a component-wide refactor.
- **Performance, good:** only the chosen adapter is tree-shaken into each package — no 5× runtime cost.
- **Security, good:** xAPI and cmi5 adapters never hold LRS credentials in the browser; they POST through the framework's `/xapi` proxy (see ADR 0013).
- **Clarity, bad:** the abstraction cost is one extra indirection every author must learn. Mitigated by a single short doc page + typed autocomplete.

## Pros and Cons of the Options

### A — Single interface + adapters

- Good: standard DI pattern every TypeScript engineer recognizes.
- Good: forces every standard through the same semantic verbs, surfacing spec mismatches at design time rather than at LMS import.
- Bad: requires discipline: any new method added to the interface must be implemented on all five adapters.

### B — Runtime detection in components

- Bad: every component becomes a standards expert; changes ripple through ~30 components.
- Bad: impossible to tree-shake unused code paths — every package ships every branch.

### C — Per-standard component variants

- Bad: 5× the components to maintain. Component authors re-implement shared logic.
- Bad: authors pick the wrong variant and ship broken packages.

### D — Write directly against scorm-again

- Bad: couples components to one library and to SCORM semantics. cmi5 and raw xAPI require a totally different shape.
- Bad: locks us to scorm-again's release cadence (single-maintainer risk — see ADR 0005).

## Interaction Shape

`recordInteraction` normalizes the SCORM interactions model (§cmi.interactions.n.* in 1.2/2004) and the xAPI `interaction`-typed Activity:

```ts
export interface Interaction {
  id: string;                          // stable IRI-safe slug
  type:
    | 'choice' | 'multiple-choice'     // MCQ / multi-response
    | 'true-false'
    | 'fill-in' | 'long-fill-in'
    | 'matching' | 'sequencing'
    | 'numeric' | 'likert' | 'other';
  description?: string;
  learnerResponse: string | string[];
  correctResponse?: string | string[];
  result: 'correct' | 'incorrect' | 'neutral';
  weight?: number;
  latency?: string;                    // ISO-8601 duration
}
```

Each adapter translates this shape into its native format (cmi.interactions for SCORM, `result` + `object.definition.interactionType` for xAPI/cmi5).

## Validation

- **Unit tests per adapter** verify the mapping: e.g. "`pass()` on `ScormAgainAdapter12` sets `cmi.core.lesson_status='passed'` and does not call
  `LMSSetValue('cmi.core.lesson_status','completed')` afterward".
- **Contract tests** against all five adapters using a shared test suite — any new Tracker method added to the interface forces implementation in every
  adapter.
- **Integration tests** launch packaged output in SCORM Cloud and assert that `setScore(0.9)` surfaces as 90% in the SCORM Cloud launch summary for each
  standard.
- **Size budget CI gate:** the bundled adapter + Tracker implementation is <10 KB gzipped per output; a failure is a blocking CI error.

## More Information

- Research §3.5 "The one-source-many-outputs build pipeline".
- Related ADRs: 0003 (standards strategy), 0005 (scorm-again as wrapper), 0013 (self-hosted LRS + proxy pattern), 0015 (packaging pipeline).
- Open question: should `recordInteraction` accept a multiple-activity correctResponse pattern (SCORM 2004's compound patterns)? Deferred until a real lesson
  needs it.
