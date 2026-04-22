# Robot Framework Execution — Context Model

## Purpose

Execute Robot Framework Suites in two operational modes with different domain shapes (Research §4.4):

1. **Batch / grading mode** — runs the classic `robot` CLI against learner code, parses `output.xml` via `robot.api.ExecutionResult` in a trusted sidecar, emits pass/fail and xAPI statements.
2. **Tutorial / guided mode** — runs [`rf-mcp`](https://github.com/manykarim/rf-mcp) as an HTTP MCP server with a constrained `ToolProfile`, exposing a live `ExecutionContext` that an AI tutor can drive keyword-by-keyword.

The context is deliberately a sibling to [Code Execution](./code-execution.md) (not a subtype) — the tutorial-mode live ExecutionContext has no analog in ExecutionRequest/ExecutionResult.

## Aggregates

- **Suite** — authored `.robot` (or built-up) test suite submitted for execution. Root because the whole Suite is the unit of grading.
- **ExecutionContext** — the live rf-mcp in-memory state for tutorial mode (Research §4.4). A long-lived aggregate keyed on `(LearnerId, LessonId)`; mutated keyword-by-keyword.
- **RobotRun** — the completed artifact bundle `{OutputXml, LogHtml, ReportHtml}` produced by batch mode. Aggregate because its parts are co-consumed.

## Entities

- _Test_ — one RF test case inside a Suite.
- _Keyword_ — one user/library keyword invocation inside a Test or an ExecutionContext step.
- _Listener_ — RF listener instance attached to a RobotRun for xAPI emission.

## Value objects

- *ToolProfile* — `minimal_exec | api_exec | learning_exec` (Research §4.4). Distinct from the seccomp *Profile* in Code Execution and the *xAPIProfile* in Tracking — see [collisions §C.3](../01-ubiquitous-language.md#c3-explicit-collision-resolution--profile).
- *OutputXml* — RF `output.xml` (parsed result tree).
- *LogHtml* — self-contained `log.html`, served from `logs.example.com` (isolated origin) in a sandboxed iframe (Research §4.4).
- *ReportHtml* — self-contained `report.html`.
- *DryRun* — flag requesting `robot --dryrun`.
- *LibraryImport* — `*** Settings ***` import entry.
- *Image* — `ghcr.io/manykarim/rf-mcp:latest` (Research §4.4) for general use; `ghcr.io/manykarim/rf-mcp-vnc:latest` for browser-automation lessons.

## Domain events

- `SuiteSubmitted` — learner submitted a suite.
- `RobotRunStarted` — batch execution began.
- `KeywordExecuted` — one keyword step completed (tutorial mode — heartbeat on ExecutionContext).
- `RobotRunCompleted` — terminal artifacts ready.
- `OutputXmlParsed` — `output.xml` ingested into domain `TestOutcome[]`.
- `LogHtmlPublished` — `log.html` served at an isolated origin.
- `RobotExecuted` — the xAPI-shaped outward event (custom verb for batch run terminal result).
- `ExecutionContextInitialized` / `ExecutionContextClosed` — tutorial-mode lifecycle.

## Application services / use cases

- **ExecuteBatch** — runs `robot` in a gVisor-sandboxed rf-mcp container against the submitted Suite; collects artifacts.
- **ParseOutputXml** — invokes `robot.api.ExecutionResult`; translates into domain `TestOutcome[]`.
- **StartTutorialSession** — boots an rf-mcp HTTP MCP server with a chosen `ToolProfile` and returns a connection token.
- **PublishLogHtml** — ships `log.html` to the isolated-origin CDN.
- **StreamKeywords** — WebSocket relay of `KeywordExecuted` events during tutorial mode.
- **PromoteProfile** — the planned `learning_exec` profile surfaces grading hooks + xAPI emitters upstream to rf-mcp itself (Research §4.4 point 5).

## Integration with other contexts

- **Upstream — [Identity & Tenancy](./identity-tenancy.md):** OHS.
- **Upstream — [Content Rendering](./content-rendering.md):** runtime — `<RunnableRF>` islands submit Suites / open ExecutionContexts.
- **Downstream — [Tracking](./tracking.md):** ACL — `RobotExecuted` and keyword events map to xAPI statements via the [rf-mcp ACL](../05-anti-corruption-layers.md#3-rf-mcp-acl).
- **Downstream — [Assessment](./assessment.md):** CS — ParseOutputXml feeds TestOutcomes into Grader.
- **Downstream — [LMS Launch](./lms-launch.md):** CS — `LogHtml` iframed from the isolated-origin CDN into the LMS-bound player.
- **Upstream partnership — rf-mcp (external project Many owns):** Partnership. Upstream contribution target is a `learning_exec` tool profile.

## Invariants and business rules

1. **Browser-automation RF (SeleniumLibrary / Browser) runs only in the `rf-mcp-vnc` Image with stricter TTLs and Firecracker-level isolation for multi-tenant contexts** (Research §4.4, §10.7).
2. **Non-browser Suites run only with whitelisted libraries** — `BuiltIn`, `Collections`, `String`, `DateTime`, `OperatingSystem` (restricted to `/tmp`), `Process`, `RequestsLibrary` (egress-proxied), `JSONLibrary`, `XML` (Research §4.4 point 4).
3. **`log.html` and `report.html` are NEVER served from the main application origin** — always from `logs.example.com` with strict CSP, inside a `sandbox="allow-same-origin"` iframe (Research §4.4 point 3).
4. **`OutputXml` is authoritative for pass/fail counts**; downstream contexts do not re-derive them from streamed events.
5. **Tutorial `ExecutionContext` has a TTL** (default 30 min idle) after which it is destroyed; learners re-initializing get a fresh context.
6. **`ToolProfile` is non-mutable for the lifetime of an `ExecutionContext`** — escalating requires a new context.
7. **rf-mcp's own API compatibility is owned by Many** (Partnership invariant) — breaking changes to rf-mcp must be coordinated; Lernkit should upstream-contribute rather than fork.
