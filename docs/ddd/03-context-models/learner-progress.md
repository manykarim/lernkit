# Learner Progress — Context Model

## Purpose

Server-side store of learner state: Enrollment, Attempt history, Bookmarks, and a mirror of SuspendData so learners can resume across devices and so authors can dashboard progress (Research §8 Phase 2, §8 Phase 4). Provides the canonical fallback when the LMS-held state is unavailable (plain HTML delivery, pre-cmi5 xAPI, or when [SuspendData truncation](./tracking.md) forces offloading state out of the LMS).

## Aggregates

- **Enrollment** — (Learner, Course) pairing with a lifecycle (enrolled → started → completed) and a start/end timestamp. Aggregate root because it scopes all Attempts and Bookmarks.
- **ProgressLedger** — per-Enrollment append-only log of progress-affecting events (StatementEmitted, AttemptGraded, BookmarkSet). Aggregate because recomputation depends on the ordered log.

## Entities

- _Attempt_ — reference into [Assessment](./assessment.md)'s Attempt aggregate; kept denormalized here for fast rollup.
- _LessonProgress_ — per-lesson state row (`{lessonId, progressPct, lastSeenAt}`).

## Value objects

- *Bookmark* — last-seen location inside the Course
- *Resume* — `{Bookmark, mirroredSuspendData}` payload handed to the player on re-entry
- *Score* (mirror of the highest-scoring terminal Attempt per Challenge)
- *EnrollmentStatus* — `enrolled | in-progress | completed | failed | expired`
- *MirroredSuspendData* — the server-side copy of SuspendData used when the LMS cannot hold it (size overflow, plain-HTML delivery)

## Domain events

- `LearnerEnrolled`
- `ProgressAdvanced`
- `BookmarkSetOnServer`
- `AttemptRolledUp` — terminal Attempt event from Assessment reflected into the ledger
- `EnrollmentCompleted`
- `EnrollmentExpired`
- `SuspendDataMirrored` — overflow event when SCORM 1.2 4 KB cap forces server-side persistence

## Application services / use cases

- **EnrollLearner** — creates an Enrollment given (Learner, Course).
- **RecordProgress** — append to ProgressLedger on upstream events.
- **ComputeLessonProgress** — projection query over the ledger.
- **FetchResume** — returns the `Resume` VO to the player on re-entry (Research §6.9 `<Resume>`).
- **ExpireStale** — sweeps Enrollments past their `ValidUntil`.

## Integration with other contexts

- **Upstream — [Identity & Tenancy](./identity-tenancy.md):** OHS for Learner identity.
- **Upstream — [Tracking](./tracking.md):** CS — Tracker events are mirrored as ledger entries.
- **Upstream — [Assessment](./assessment.md):** CS — terminal Attempt events roll up here.
- **Downstream — [LMS Launch](./lms-launch.md):** CS — Bookmark & MirroredSuspendData fetched on launch.
- **Downstream — [Content Rendering](./content-rendering.md):** runtime — `<Resume>` island reads from here.

## Invariants and business rules

1. **Every Enrollment belongs to exactly one Tenant** (RLS invariant).
2. **ProgressLedger is append-only** — corrections are compensating entries, never in-place edits (audit invariant).
3. **`MirroredSuspendData` is only populated when the active LMS cannot hold the payload** — for SCORM 1.2 launches, the Adapter emits `SuspendDataTruncated` and this context picks up the overflow (Research §3.2, §10).
4. **`Resume` reconciles LMS-held and server-held state** — on re-entry, the LMS copy wins for fields the LMS holds authoritatively (`lesson_location`), but the server wins for oversized or plain-HTML-delivered state.
5. **EnrollmentCompleted requires ALL of: lesson-coverage ≥ mastery threshold, terminal Attempts on every graded Challenge, xAPI `completed` statement** — the three must agree, or the event is not emitted.
6. **Expired Enrollments can be re-opened but not re-enrolled** — preserves statement-history continuity.
