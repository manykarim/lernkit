# 05 — Anti-Corruption Layers

Where two [bounded contexts](./02-bounded-context-map.md) have genuinely incompatible models, Lernkit installs a translation layer (ACL) that absorbs the mismatch and prevents foreign vocabulary from leaking. Each section below describes one ACL: the two sides, the translation, and the invariants the ACL enforces.

Contexts are linked to their [context models](./03-context-models/). Citations "§N" refer to [`compass_artifact_...md`](../research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md).

---

## 1. Tracker ACL

### Sides

- **Upstream / internal:** [Content Rendering](./03-context-models/content-rendering.md), [Code Execution](./03-context-models/code-execution.md), [RF Execution](./03-context-models/robot-framework-execution.md), [Assessment](./03-context-models/assessment.md) — all speak domain verbs (`setProgress`, `setScore`, `complete`, `pass`).
- **Downstream / external:** SCORM 1.2, SCORM 2004 4th, cmi5, xAPI 2.0 — each with its own wire-level idiom.

### Translation

The [Tracker](./03-context-models/tracking.md) exposes one domain-shape method per domain verb. The call is dispatched to exactly one *Adapter* (baked in at build time by [Packaging](./03-context-models/packaging.md)):

| Domain call | `ScormAgainAdapter12` | `ScormAgainAdapter2004` | `Cmi5Adapter` | `XapiAdapter` | `NoopAdapter` |
|---|---|---|---|---|---|
| `setProgress(pct)` | `cmi.core.lesson_location`, `cmi.core.lesson_status = incomplete` | `cmi.progress_measure` | `progressed` xAPI statement | `progressed` | — |
| `setScore({scaled, raw, min, max})` | `cmi.core.score.raw/max/min` (scaled dropped) | `cmi.score.scaled/raw/min/max` | `scored` xAPI with `result.score` | `scored` | — |
| `complete()` | `cmi.core.lesson_status = completed` | `cmi.completion_status = completed` | `completed` xAPI | `completed` | — |
| `pass()` | `cmi.core.lesson_status = passed` (erases completed!) | `cmi.success_status = passed` | `passed` xAPI | `passed` | — |
| `fail()` | `cmi.core.lesson_status = failed` | `cmi.success_status = failed` | `failed` xAPI | `failed` | — |
| `terminate()` | `LMSFinish` | `Terminate` | `terminated` xAPI | `terminated` | — |

### Invariants enforced by the ACL

1. **Domain callers never see SCORM field names or xAPI verb IRIs** — if a caller would need them, the `Tracker` interface has a missing method, not leaking.
2. **SCORM 1.2's `passed`-erases-`completed` quirk is hidden** — on `complete() + pass()`, the 1.2 Adapter emits both in the correct order so that the LMS ends in the intended state (§3.2).
3. **Score shape normalization** — internal model always has `{scaled, raw, min, max}`; each adapter picks the subset its target supports.
4. **cmi5 `initialized` precondition is enforced** — the cmi5 Adapter synthesizes `initialized` if any verb is called before it (§4.5, Flow 6).

---

## 2. LMS Manifest ACL

### Sides

- **Upstream:** [Authoring](./03-context-models/authoring.md) publishes a unified `CoursePackage` value object describing the Course structure in domain terms.
- **Downstream:** SCORM's `imsmanifest.xml` XML schema, cmi5's `cmi5.xml`, xAPI bundle's `config.json` — three incompatible serializations.

### Translation

[Packaging](./03-context-models/packaging.md) runs a dedicated *manifest builder* per PackageKind. Builders are implemented as **Nunjucks templates fed from the CoursePackage VO** (Research §3.5). The authoring side never knows an `ActivityTree` XML element tree exists.

### Invariants enforced by the ACL

1. **SCORM 1.2's 4 KB `suspend_data` cap lives inside this ACL (as the `SuspendDataBudget` VO handed to Tracking's 1.2 Adapter)** — never in [Authoring](./03-context-models/authoring.md) or [Content Rendering](./03-context-models/content-rendering.md).
2. **Zip layout invariants** (manifest-at-root, no `__MACOSX/`, no `.DS_Store`, UTF-8 names) are enforced here via `ValidateZipLayout` (§3.2).
3. **`schemaversion` string values are per-builder** — a SCORM 2004 4th Ed package's schemaversion string is a builder constant, never a CoursePackage field.
4. **AssetRewrite converts absolute-URL assets to package-relative** before zipping — authors can use absolute URLs in dev; the ACL transforms them for LMS iframes.
5. **The cmi5 builder MAY leave asset URLs absolute** — cmi5's specification allows external content, SCORM does not. The two builders differ by one rule.

---

## 3. rf-mcp ACL

### Sides

- **Upstream / internal:** [Robot Framework Execution](./03-context-models/robot-framework-execution.md) speaks `RobotExecutionRequest`, `RobotExecutionResult`, `TestOutcome`, `ExecutionContext`.
- **Downstream / external:** rf-mcp's MCP tool protocol (JSON-RPC-like tool invocations) and RF's `output.xml` schema.

### Translation

- **Batch mode:** Lernkit POSTs `{suite, env, toolProfile}` to rf-mcp's HTTP endpoint; rf-mcp invokes `robot` CLI; output returns as file artifacts (`output.xml`, `log.html`). The ACL uses `robot.api.ExecutionResult` in a *trusted sidecar* (not the sandbox) to parse `output.xml` into `TestOutcome[]` (Research §4.4).
- **Tutorial mode:** Lernkit opens an MCP session with `toolProfile=learning_exec` (planned upstream contribution — Research §4.4 point 5). Each `KeywordExecuted` from rf-mcp is translated to a domain keyword event; each domain-side request (suggest keyword, run step, rollback step) is translated to an rf-mcp tool call.

### Invariants enforced by the ACL

1. **rf-mcp tool names NEVER appear in domain code** — always translated to/from domain verbs.
2. **`output.xml` parsing is the authoritative source for pass/fail** — we do not re-derive from streamed events (data integrity invariant).
3. **`log.html` and `report.html` are always served from the isolated origin** — the ACL is responsible for uploading them to `logs.example.com` and returning only the URL, not the HTML itself (§4.4 point 3).
4. **ToolProfile is validated against an allowlist per lesson difficulty** — `minimal_exec` for beginner lessons, `api_exec` for API-testing lessons, `learning_exec` for tutor-driven lessons.
5. **The `rf-mcp-vnc` variant is a distinct container image with its own ACL policy** — browser-automation lessons require stricter TTLs and hardware isolation (§4.4 point 4).

---

## 4. Pyodide ACL

### Sides

- **Upstream / internal:** [Code Execution](./03-context-models/code-execution.md) speaks `ExecutionRequest`, `StreamChunk`, `ExecutionResult`.
- **Downstream / external:** Pyodide's JS interop (a Web Worker postMessage protocol — Comlink async-only by default, Coincident + SharedArrayBuffer under cross-origin isolation — Research §4.1).

### Translation

A worker-boundary shim translates each side:

- Outbound: `ExecutionRequest{language: python, source, stdin}` → worker `postMessage({type: 'run', src, stdin})`.
- Inbound: worker `onmessage({type: 'stdout', chunk})` → `StreamChunk{kind: 'stdout', payload, seq}`.
- Terminal: worker `{type: 'done', exit}` → `ExecutionResult`.

The ACL also manages Pyodide lifecycle: cold-start pre-cache via Service Worker, `pyodide.setStdout({batched})` wiring, `pyodide.setInterruptBuffer` for `KeyboardInterrupt` when COOP/COEP isolation is active, `matplotlib_pyodide.html5_canvas_backend` setup, IDBFS for persistent filesystem.

### Invariants enforced by the ACL

1. **No Pyodide-specific types cross the boundary** into domain code — if Pyodide changes its postMessage shape, only this ACL is affected.
2. **Cross-origin isolation is only enabled when the current route opts in** — the ACL detects the presence of `SharedArrayBuffer` and degrades gracefully to async-only `Comlink` when absent (Research §4.1, §10.5).
3. **`requests` library is blocked** — pure `requests` is broken in browser; the ACL rejects such imports with a domain-level error recommending `pyodide.http.pyfetch` (Research §4.1).
4. **stdout/stderr chunk ordering is preserved via monotonic `seq`** — late-arriving out-of-order postMessages are reordered by the ACL.
5. **Memory and time caps are advisory inside Pyodide** (no OS-level enforcement) — the ACL kills the worker on wall-clock breach; in-worker loops can't be preempted without `setInterruptBuffer`.

---

## 5. xAPI Statement ACL

### Sides

- **Upstream / internal:** Lernkit DomainEvents (`Passed`, `CodeExecuted`, `RobotExecuted`, `InteractionRecorded`) in their native domain shape.
- **Downstream / external:** xAPI 2.0 `Statement` JSON schema — rigid Actor/Verb/Object/Result structure with mandatory IRIs and specific result.score layout.

### Translation

Each DomainEvent has a mapper to an xAPI Statement. The mapper:

1. Resolves Actor from the [IAM](./03-context-models/identity-tenancy.md) Subject.
2. Resolves Verb from a fixed verb registry (ADL canonical verbs for `passed`/`failed`/`completed`/`initialized`/`terminated`; Lernkit custom verbs for `executed-code`/`used-hint`/`reset-cell` — Research §4.5).
3. Resolves Activity from the `ActivityRegistry` VO owned by [Tracking](./03-context-models/tracking.md).
4. Bundles context extensions including `TraceId`, `CourseVersion`, cmi5 `Registration` (Research §3.2).
5. Assembles `result.score` from domain Score `{scaled, raw, min, max}`.
6. **Validates the final JSON against the xAPI 2.0 JSON schema** before allowing egress; invalid statements emit `StatementRejected` and are dropped with a WARN log.

### Invariants enforced by the ACL

1. **No unvalidated statement reaches the LRS.**
2. **ActivityId IRIs are stable per Course version** (§3.2) — the registry enforces this.
3. **Intermediate `executed-code` statements carry `SourceHash` not full source**; full source is attached only on terminal `passed`/`failed` (§4.5 storage-bounding).
4. **cmi5 statements carry `context.registration` as a UUID** — missing registration = dropped statement.
5. **TraceId is round-tripped** as a context extension for Observability correlation.

---

## 6. H5P ACL

### Sides

- **Upstream / internal:** [Tracking](./03-context-models/tracking.md) expects domain-verb calls via the Tracker interface.
- **Downstream / external:** The `h5p-standalone` library raises DOM CustomEvents + an internal `EventDispatcher` pattern emitting xAPI-shaped events from inside an iframe (Research §1.2, §6.10).

### Translation

The `<H5P>` component wraps `h5p-standalone`, mounts the H5P iframe, and installs a `postMessage` listener. Inbound messages are xAPI-shape statements from the H5P library; the ACL translates them to domain Tracker calls:

- H5P `completed` → `tracker.complete()`
- H5P `answered` with `result.score.scaled` → `tracker.setScore({scaled})`
- H5P `interacted` → `tracker.recordInteraction(...)`

### Invariants enforced by the ACL

1. **H5P iframes run sandboxed** (`sandbox="allow-scripts allow-same-origin"` — `allow-same-origin` required by h5p-standalone for library loading, so no `allow-top-navigation` etc.).
2. **The ACL trusts only xAPI-shaped messages from the expected origin** — all others are dropped (CSP + origin check).
3. **H5P content packages are static assets pinned in `dist/`** — the iframe never fetches from the public H5P hub at runtime (Research §6.10).
4. **H5P's `libraryInfo` is frozen at build time** — no runtime library upgrades.

---

## ACL summary table

| ACL | Upstream side | Downstream side | Owned by |
|---|---|---|---|
| Tracker ACL | Rendering, Code Exec, RF Exec, Assessment | SCORM 1.2 / 2004 / cmi5 / xAPI | [Tracking](./03-context-models/tracking.md) |
| LMS Manifest ACL | Authoring (CoursePackage VO) | `imsmanifest.xml` / `cmi5.xml` / `config.json` | [Packaging](./03-context-models/packaging.md) |
| rf-mcp ACL | RF Execution | rf-mcp MCP protocol + `output.xml` | [RF Execution](./03-context-models/robot-framework-execution.md) |
| Pyodide ACL | Code Execution | Pyodide Worker postMessage protocol | [Code Execution](./03-context-models/code-execution.md) |
| xAPI Statement ACL | Tracking DomainEvents | xAPI 2.0 JSON schema | [Tracking](./03-context-models/tracking.md) / [LMS Launch](./03-context-models/lms-launch.md) |
| H5P ACL | Tracker interface | h5p-standalone iframe events | [Content Rendering](./03-context-models/content-rendering.md) (the `<H5P>` component) |
