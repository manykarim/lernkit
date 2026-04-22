# Tracking — Context Model

## Purpose

Expose a single domain-level `Tracker` facade with methods `init / setProgress / setBookmark / recordInteraction / setScore / complete / pass / fail / terminate` so that component authors never touch SCORM or xAPI details directly (Research §3.5). Own the five Adapters (`ScormAgainAdapter12`, `ScormAgainAdapter2004`, `Cmi5Adapter`, `XapiAdapter`, `NoopAdapter`); one is bundled per [Package](./packaging.md) variant. Tracking is where all of Lernkit's standards-language lives.

This is the **Open Host Service** context — emitters speak domain terms, the Tracker dispatches to the right spec on the wire.

## Aggregates

- **Tracker** — the aggregate root of the runtime side. Owns the active Adapter selection (a value object at runtime but the choice is build-time-baked), the current Registration, and the in-flight Statement outbox.
- **Statement** — the xAPI aggregate. The Tracker produces Statements; the [LMS Launch / LRS Gateway](./lms-launch.md) ships them.
- **ActivityRegistry** — per-build lookup from `(CourseId, LessonId, CourseVersion)` to stable xAPI `ActivityId` IRIs (Research §3.2).

## Entities

- _Adapter_ — one of `ScormAgainAdapter12 / ScormAgainAdapter2004 / Cmi5Adapter / XapiAdapter / NoopAdapter`.
- _Actor_ — the learner subject of a Statement (the IAM Subject mapped into xAPI shape).
- _Activity_ — xAPI activity definition, keyed by its `ActivityId`.

## Value objects

- *Verb* — xAPI verb
- *ActivityId* — stable IRI
- *IRI* — generic IRI VO
- *Registration* (cmi5) — UUID; see [collisions §C.1](../01-ubiquitous-language.md#c1-explicit-collision-resolution--registration)
- *Session* (xAPI, SCORM) — see [collisions §C.2](../01-ubiquitous-language.md#c2-explicit-collision-resolution--session)
- *Score* (scaled / raw / min / max)
- *Completion*, *Success* — orthogonal VOs in SCORM 2004 / cmi5; collapsed into *LessonStatus* in SCORM 1.2
- *SuspendData* — 4 KB in SCORM 1.2, 64 KB in SCORM 2004 (Research §3.2)
- *Bookmark*
- *Interaction* — `cmi.interactions.N.*` shape
- *MoveOn*, *LaunchMode*, *LaunchMethod*, *ReturnURL* — cmi5 launch VOs
- *xAPIProfile* — statement-shape constraint set (the cmi5 xAPI profile is one)

## Domain events

- `TrackerInitialized`
- `ProgressUpdated`
- `BookmarkSet`
- `InteractionRecorded`
- `ScoreSet`
- `Completed`
- `Passed` / `Failed`
- `Terminated`
- `StatementEmitted` — per xAPI Statement the Tracker sends (outbound to [LMS Launch](./lms-launch.md))
- `StatementBatchFlushed` — per batch flush event
- `SuspendDataTruncated` — when SCORM 1.2 4 KB cap forces a truncation (audit event — Research §3.2)

## Application services / use cases

- **BootstrapTracker** — called once per Lesson launch; binds the compiled Adapter to the cmi5 launch parameters (or SCORM API stub) and resolves the *Registration* for the session.
- **DispatchSetScore / DispatchComplete / etc.** — thin dispatch methods that route domain calls through the Adapter.
- **EmitStatement** — enqueues a Statement on the outbox.
- **FlushOutbox** — batches pending Statements and hands them to [LMS Launch](./lms-launch.md) for LRS delivery (Research §4.5 — batching as the mitigation for statement explosion).
- **ResolveActivityId** — deterministic derivation of the stable IRI for a Lesson.

## Integration with other contexts

- **Upstream — [Code Execution](./code-execution.md), [RF Execution](./robot-framework-execution.md), [Assessment](./assessment.md), [Content Rendering](./content-rendering.md):** ACL inbound — each emits domain-shape events that the Tracker translates.
- **Downstream — [LMS Launch / LRS Gateway](./lms-launch.md):** ACL outbound — Statements are validated against the xAPI 2.0 JSON schema before the Gateway POSTs them.
- **Downstream — [Packaging](./packaging.md):** OHS — Packaging chooses which Adapter bundle to include per PackageKind.
- **Downstream — [Learner Progress](./learner-progress.md):** CS — Tracker events also get persisted to the server-side Progress store.

## Invariants and business rules

1. **Exactly one Adapter is live per Tracker instance.** Build-time decision; cannot switch at runtime (Research §3.5).
2. **`ActivityId` IRIs MUST be stable across Course versions** — changing them fragments learner xAPI history. Version bumps are opt-in events that intentionally break history; bare re-publishes MUST NOT (Research §3.2).
3. **SCORM 1.2 `SuspendData` MUST NOT exceed 4,096 characters** — enforced inside the SCORM 1.2 Adapter; when exceeded, Tracker emits `SuspendDataTruncated` and falls back to a server-side [Learner Progress](./learner-progress.md) record (Research §3.2, §10).
4. **`passed` in SCORM 1.2 erases `completed`** — the Adapter is aware; the Tracker preserves the domain-level "both completed and passed" by emitting *both* calls in the correct order per LMS (Research §3.2).
5. **cmi5 `initialized` MUST be the first statement after `launched` in every session** — enforced as an Adapter invariant; if Tracker is called with any other verb first, `initialized` is synthesized (Research §Flow).
6. **Every outbound Statement MUST validate against xAPI 2.0 JSON schema** (Research §5 ACL). Invalid statements are logged + dropped; they NEVER reach the LRS.
7. **Statements are batched** — minimum 1 per 250 ms flush window, maximum batch size 32 — to bound LRS load (Research §10.10).
8. **Statements carry `TraceId` as an extension** for end-to-end Observability correlation (Research §C, Obs).
