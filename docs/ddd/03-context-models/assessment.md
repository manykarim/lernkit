# Assessment & Grading — Context Model

## Purpose

Evaluate learner responses against authored correctness criteria, producing a Score, Feedback, and an Attempt record. Covers both quiz-style assessment (MCQ, fill-blank, matching, etc.) and test-driven Challenge grading (Research §6.5–§6.6). Assessment is deliberately independent of *how* code ran — the execution context ([Code Execution](./code-execution.md) or [RF Execution](./robot-framework-execution.md)) is upstream.

## Aggregates

- **Attempt** — one learner's submission of a Quiz or Challenge. Aggregate root because it owns the Responses, the Score, and the lifecycle (draft → submitted → graded → reviewable).
- **Grader** — reusable grading strategy; owns the rubric or test harness invocation. Distinct aggregate because the same Grader can evaluate many Attempts.
- **QuestionBankDraw** — the realized random-draw from a [QuestionBank](./authoring.md) for one Attempt. Aggregate root since the draw set must be stable across reviews.

## Entities

- _Response_ — one learner answer to one question inside an Attempt.
- _TestRunReport_ — the per-test breakdown emitted after a Grader runs hidden tests against a Challenge submission.

## Value objects

- *Score* — `{scaled ∈ [-1,1], raw, min, max}` (Research §C)
- *PassingScore* — the author-declared threshold
- *Feedback* — per-response explanatory text (Research §6.6)
- *ReviewMode* — flag on an Attempt indicating post-submit answer visibility
- *HintUsage* — `{hintIndex, cost}` pairs attached to an Attempt, driving score degradation (Research §1.3, §4.5)
- *Rubric* — declarative evaluator spec for a question (correct-option list, regex, numeric tolerance)
- *TestOutcome* — `{testId, passed, durationMs, errorMessage?}`

## Domain events

- `AttemptStarted` — learner opened the Quiz/Challenge.
- `ResponseRecorded` — one individual response captured.
- `AttemptSubmitted` — learner hit submit; grading enters the queue.
- `AttemptGraded` — Grader finished; Score + Feedback attached.
- `AttemptPassed` / `AttemptFailed` — terminal success/failure event (corresponds to xAPI `passed`/`failed` verbs).
- `HintUsed` — learner revealed a hint, incurring score cost.
- `AttemptResumed` — Attempt picked up from a prior Bookmark.

## Application services / use cases

- **StartAttempt** — creates an Attempt scoped to (Learner, Enrollment, Challenge|Quiz).
- **RecordResponse** — idempotent upsert of one Response by `(AttemptId, QuestionId)`.
- **SubmitAttempt** — transitions Attempt into graded state; dispatches to the right Grader (Rubric for quizzes, test harness for Challenges).
- **GradeWithRubric** — evaluates each Response against its Rubric, produces a Score.
- **GradeWithTestHarness** — hands an `ExecutionRequest` to [Code Execution](./code-execution.md) or [RF Execution](./robot-framework-execution.md), collects `TestOutcome`s, produces a Score incorporating `HintUsage` cost.
- **DrawFromBank** — materializes a `QuestionBankDraw` for an Attempt.

## Integration with other contexts

- **Upstream — [Code Execution](./code-execution.md):** CS for the test-running service; requests ExecutionResults and reads TestOutcomes.
- **Upstream — [RF Execution](./robot-framework-execution.md):** CS via RF `OutputXml` parsing.
- **Downstream — [Tracking](./tracking.md):** ACL — Attempt events translate to xAPI statements (`passed`, `failed`, `scored`, `used-hint`).
- **Downstream — [Learner Progress](./learner-progress.md):** CS — Attempts roll up to Enrollment progress.

## Invariants and business rules

1. **An Attempt MUST have a single terminal graded state** (`passed | failed`) once `AttemptGraded` fires; retries produce a *new* Attempt.
2. **HintUsage is irrevocable within an Attempt** — revealing a hint cannot be "un-revealed" to restore score (Research §4.5).
3. **For Challenges, all HiddenTests MUST run**; a partial run is a grading failure, not a passing grade.
4. **QuestionBankDraw is immutable once materialized** — re-loading the Attempt shows the same questions.
5. **Score is in `[-1, 1]` when scaled**, matching xAPI / SCORM 2004 / cmi5 convention; the Tracking ACL maps to SCORM 1.2 raw scores on output (Research §C).
6. **Review mode cannot modify Responses**; ReviewMode is a pure UI flag.
7. **A terminal `AttemptPassed` or `AttemptFailed` event carries full source** (for Challenges); intermediate `ResponseRecorded` events carry only *SourceHash* when the response is code (Research §4.5 — storage-bounding rule).
