# Code Execution — Context Model

## Purpose

Execute learner-submitted code safely and stream outputs back in real time, in two deployment modes: in-browser (Pyodide for Python; Sandpack / sandboxed iframe for JS/TS) and server-side (FastAPI + Docker + gVisor for polyglot, heavy, or graded runs) (Research §4.1–§4.3). This context owns the execution safety budget and the grading-harness orchestration.

## Aggregates

- **ExecutionRequest** — the root of a submitted run. Aggregate because it governs the end-to-end lifecycle (queued → running → streaming → terminal).
- **Sandbox** — the isolation boundary around a Runner. Aggregate root separately from the Runner because its hardening config (seccomp, egress policy, capabilities, resource limits) is the security invariant; the Runner is the ephemeral process.
- **WarmPool** — the Redis-tracked pool of prewarmed Runners per Image, coordinated across FastAPI instances.
- **Grader** — the test-harness orchestrator for a Challenge submission (Research §6.5). Separate aggregate because one Grader can be invoked by many ExecutionRequests.

## Entities

- _Runner_ — one live container instance pulled from the WarmPool, identified by container id + WarmPool slot.
- _ExecutionSession_ — the lifetime of a Stream attached to one ExecutionRequest (distinct from xAPI Session and HTTP session — see [ubiquitous language §C.2](../01-ubiquitous-language.md#c2-explicit-collision-resolution--session)).

## Value objects

- *ExecutionResult* — `{exitCode, stdout, stderr, durationMs, capturedFiles[]}`
- *Image* — container image tag, immutable (Research §4.4)
- *Profile* (Code Execution sense) — `{Image, ResourceLimits, SeccompProfile, EgressPolicy}`
- *ResourceLimits* — `{cpu, memoryBytes, pids, tmpfsBytes, wallSeconds}` (Research §4.3)
- *SeccompProfile* — the syscall-filter JSON
- *EgressPolicy* — `none | allowlist[]`
- *Quota* — `{perUserDailyCount, perUserCumulativeCpuSec}`; enforced in Redis *before* container spawn (Research §4.3, §10.3)
- *Timeout* — wall-clock cap enforced by the orchestrator (never in-container) (Research §4.3)
- *Stream* and *StreamChunk*, specialized as *StdinFrame* / *StdoutFrame* / *StderrFrame*
- *SourceHash* — `sha256(source)` (Research §4.5)
- *DebouncedRun* — client-side coalesced emission key

## Domain events

- `ExecutionRequested` — arrived at the API.
- `QuotaCheckPassed` / `QuotaExceeded` — Redis pre-check.
- `SandboxAllocated` — a Runner was assigned from the WarmPool.
- `ExecutionStarted` — container process has begun.
- `StreamChunkEmitted` — one stdout/stderr frame.
- `ExecutionTimedOut` — wall-clock breached (security invariant).
- `ExecutionCompleted` — terminal ExecutionResult produced.
- `CodeExecuted` — the canonical xAPI-shaped event emitted to [Tracking](./tracking.md) (custom xAPI verb) — carries SourceHash only, full source only on terminal pass/fail (Research §4.5).
- `SandboxDestroyed` — Runner torn down post-run; WarmPool refills from golden image.
- `GradingCompleted` — Grader produced a `Score` + `TestOutcome[]`.

## Application services / use cases

- **SubmitExecutionRequest** — the public API entrypoint; validates, checks Quota, enqueues.
- **AllocateRunner** — pulls a Runner from the WarmPool or spawns one (cold-start penalty).
- **StreamExecution** — pipes container stdout/stderr into an SSE/WebSocket Stream.
- **TerminateExecution** — enforces Timeout, kills container.
- **GradeSubmission** — invoked by [Assessment](./assessment.md); wraps ExecutionRequest with hidden tests, collects TestOutcomes.
- **RefillWarmPool** — background service that keeps the pool topped up from golden Image.

## Integration with other contexts

- **Upstream — [Identity & Tenancy](./identity-tenancy.md):** OHS — every request carries an OIDC subject for Quota keying.
- **Upstream — [Content Rendering](./content-rendering.md):** runtime — runnable Islands submit ExecutionRequests over WebSocket.
- **Downstream — [Tracking](./tracking.md):** ACL — ExecutionResult → xAPI `executed-code` / `passed` / `failed`. See [ACL §Pyodide and §xAPI Statement](../05-anti-corruption-layers.md).
- **Downstream — [Assessment](./assessment.md):** CS — Grader runs produce TestOutcomes.
- **Sibling — [RF Execution](./robot-framework-execution.md):** Separate Ways (Research §4.3/§4.4 split) — share container base but not domain model.

## Invariants and business rules

1. **Every Sandbox MUST be launched with `--runtime=runsc --network=none --read-only --tmpfs /tmp --cap-drop=ALL --security-opt=no-new-privileges --security-opt seccomp=profile.json` and a wall-clock Timeout enforced outside the container** (Research §4.3). A single missing flag is a security incident.
2. **Quota is checked BEFORE any container allocation** — otherwise the pool can be exhausted by abuse (Research §4.3, §10.3).
3. **Containers are ephemeral**: never reused across users; destroyed after every job; refilled from a signed, scanned golden Image (Research §4.3).
4. **Stdout/stderr are capped at 1 MB**; exceeding truncates and kills (Research §4.3).
5. **Intermediate `CodeExecuted` events carry SourceHash only, not full source** (Research §4.5) — full source is persisted only on terminal `AttemptPassed` / `AttemptFailed`.
6. **Browser-mode Pyodide execution is funneled through the same `ExecutionRequest` / `StreamChunk` VOs** as server-mode — an ACL at the worker-postMessage boundary performs the translation (see [ACL §Pyodide](../05-anti-corruption-layers.md)).
7. **Cross-origin isolation headers (`COOP` + `COEP`) are scoped to the code-runner route only** (Research §4.1, §10.5); the context must surface this as a configuration contract to [Content Rendering](./content-rendering.md).
8. **Rapid-fire "Run" clicks are coalesced client-side into a *DebouncedRun*** — the server never sees the extra emissions, bounding xAPI statement explosion (Research §4.5, §10.10).
