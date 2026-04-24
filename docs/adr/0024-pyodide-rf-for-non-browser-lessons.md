---
status: accepted
date: 2026-04-24
deciders: core team
consulted: Many
informed: future engineering team
supersedes: portions of 0009
---
# 0024 — Run non-browser Robot Framework lessons in Pyodide; keep rf-mcp for browser-automation

## Context and Problem Statement

[ADR 0009](./0009-reuse-rf-mcp-as-robot-framework-runner-base.md) committed Lernkit to using `ghcr.io/manykarim/rf-mcp` as the **server-side** Robot Framework runner, with the implicit assumption that browser-side RF execution wasn't viable. The phase plan therefore placed every `<RunnableRobot>` experience behind a Phase-3 rf-mcp integration.

On 2026-04-24 the evaluation memo at [`docs/evaluations/rf-cert-platform-reuse.md`](../evaluations/rf-cert-platform-reuse.md) reviewed `rf-cert-platform` — a working RFCP exam-prep platform — and demonstrated that **Robot Framework 7.4.2 runs end-to-end inside Pyodide 0.29.3**. Their `scripts/pyodide-test/validate-rf.mjs` (288 lines, exit-0 when all pass) exercises K3 RF features — suites, variables, keywords, resource files, templates, setup/teardown, tags, IF/FOR — and generates `log.html`, `report.html`, and `output.xml` from pure-browser execution via `micropip.install("robotframework")` + `robot.run()`.

This ADR documents the scope split between the two RF runners and authorises the browser-side path as a Phase-2 deliverable.

## Decision Drivers

- **Latency to product value.** Pyodide-RF is available today with our existing Web Worker infrastructure (ADR 0006). rf-mcp requires the full FastAPI + gVisor sandbox stack (ADR 0008), which is Phase 3. Shipping a subset of RF lessons in Phase 2 materially accelerates the product.
- **Operational cost.** Pyodide-RF runs on the static origin — zero server CPU, zero queueing, zero sandbox escape surface on the server. For single-tenant OSS deployments (ADR 0022) this is a significant reduction in operator burden.
- **Scope honesty.** rf-mcp remains irreplaceable for browser-automation lessons (SeleniumLibrary, Browser library), lessons that need a real shell, binary libraries, or network access beyond same-origin `fetch()`. Pyodide-RF is not a replacement — it is a second path.
- **Self-host posture (ADR 0021).** Pyodide is already self-hosted. Extending to include a vendored `robotframework` wheel preserves the single-substrate operational story.
- **Conformance with ADR 0006.** `robot.run()` is pure-Python and does not require cross-origin isolation (no `input()`, no `SharedArrayBuffer`). The async-Comlink pattern the existing Pyodide worker uses fits RF without modification.

## Considered Options

- **A:** Dual runners — Pyodide-RF (browser) for non-browser lessons; rf-mcp (server) for browser-automation lessons. Authors tag the lesson; the framework picks the runtime.
- **B:** Keep ADR 0009's implicit rf-mcp-only stance. Defer all `<RunnableRobot>` to Phase 3.
- **C:** Replace rf-mcp with Pyodide-RF. Give up browser-automation lessons or handle them via an entirely different route.
- **D:** Offer Pyodide-RF only as a preview fallback when no rf-mcp is configured.

## Decision Outcome

Chosen option: **A — dual runners, split by lesson type.**

### Runtime routing rules

- **Pyodide-RF** (browser) handles lessons whose `.robot` files use only pure-Python libraries:
  - `BuiltIn` (always available)
  - `Collections`, `String`, `DateTime`, `XML`, `Process` (pure-Python, install on demand via local wheels)
  - `RequestsLibrary` (pure-Python, but gated on same-origin `fetch` / egress policy — mark as "network may fail" at authoring time)
  - `OperatingSystem` (restricted to Pyodide virtual FS only — any path outside `/home/pyodide/` raises)
- **rf-mcp** (server) remains the only path for:
  - `SeleniumLibrary`, `Browser` (Playwright) — need a real browser
  - `SSHLibrary`, `DatabaseLibrary`, any library with C extensions or native binaries
  - Lessons that need file I/O outside the Pyodide FS, real network, or long-running background processes
- **Author opt-in.** A lesson frontmatter field (`runner: "pyodide" | "rf-mcp"`) tells the build which component to hydrate. Default for Phase 2 is `pyodide`; the default flips to `rf-mcp` when a declared library is in the server-only list.

### Packaging & distribution

- The `robotframework` wheel is **self-hosted at `/pyodide/wheels/robotframework-7.4.2-py3-none-any.whl`** (extends ADR 0021). No micropip PyPI fetches at runtime — the Worker installs from the same-origin URL only.
- A build-time `download-rf-wheels.mjs` script pins the wheel version + SHA-256 and vendors it into `apps/docs/public/pyodide/wheels/`. `.gitignore`'d (same pattern as `public/pyodide/`).
- `pnpm prebuild` runs the wheel downloader alongside the existing Pyodide copy step.

### Editor + autocomplete

Per ADR 0010 we use **CodeMirror 6** as the editor, not `rf-cert-platform`'s textarea-over-Prism approach. For the Phase-2 MVP of `<RunnableRobot>` we ship the simplest possible editor (a `<textarea>` with monospace styling and acceptable tab handling) and flag CodeMirror 6 + Lezer grammar + libdoc-backed autocomplete as the immediate next slice.

### What this ADR does not decide

- **Autocomplete backend.** The `robot.api.get_model()` pattern from `rf-cert-platform` is the right choice; ship in the next slice.
- **Libdoc JSON source.** Bundle in-repo under `apps/docs/public/rf-libdocs/` (ADR 0021) rather than fetched from `robotframework.org` at runtime. Next slice.
- **Artifact surfacing.** `log.html` / `report.html` as rendered strings in a sibling `<RobotArtifacts>` component. Next slice.

### Consequences

- **Functionality, good:** Lernkit ships a working in-browser RF runner in Phase 2 — months earlier than the Phase-3 target in `docs/plan/02-phase-plan.md`.
- **Clarity, good:** The dual-runner model matches the Pyodide / Sandpack / FastAPI split already in place for other languages — authors make the same choice, just in one more dimension.
- **Security, good:** The rf-mcp sandbox surface (gVisor, warm pool, egress policy) gains no new attack paths. Pyodide-RF inherits the same sandbox envelope we already accepted for Python cells.
- **Cost, good:** Zero server cost for the subset of lessons that fit the Pyodide-RF envelope. Operators only pay for rf-mcp CPU when they actually enable browser-automation lessons.
- **Performance, mixed:** First-time cold install of RF in Pyodide is 20–60 s on PyPI; the self-hosted wheel collapses that to ~5–10 s. Warm-cache is sub-second.
- **Authoring, mixed:** Authors must now choose a runner per lesson. Mitigated by a sensible default ("pyodide" unless the lesson declares a server-only library) and by validating the choice at build time.

## Pros and Cons of the Options

### A — Dual runners, split by lesson type — chosen

- Good: ships value in Phase 2 without blocking Phase-3 rf-mcp work.
- Good: matches the one-substrate-per-task pattern used elsewhere (Sandpack / Pyodide / FastAPI).
- Good: operators who never enable rf-mcp still get ~80% of a beginner RF course.
- Bad: two runtimes to document, two runtimes to test. We accept this because the mental model (browser = pure-Python RF; server = real-machine RF) is intuitive.

### B — Keep ADR 0009's rf-mcp-only stance

- Good: one runtime, one mental model.
- Bad: every `<RunnableRobot>` lesson blocked on Phase-3 sandbox work.
- Bad: server-side execution for a lesson that `rf-cert-platform` has proven runs client-side is pure overhead.

### C — Replace rf-mcp with Pyodide-RF

- Good: one runtime.
- Bad: gives up browser-automation lessons (SeleniumLibrary / Browser). Those are exactly the lessons Many owns upstream via rf-mcp. Non-starter.

### D — Pyodide-RF only as preview fallback

- Good: smallest change to ADR 0009.
- Bad: misses the zero-server-cost deployment story. For an OSS single-tenant framework (ADR 0022), that's the wrong trade.

## Validation

- **CI gate: `validate-rf.mjs` ported from `rf-cert-platform`.** Node-side Pyodide boot + micropip install from the local wheel + run a 4-feature RF suite (covers the same K3 breadth). Exit 0 required on every main-branch push. Runs in < 2 min wall-clock.
- **Component test.** `<RunnableRobot>` renders, the Run button dispatches to the worker, stdout/stderr panels update, log.html is readable. Mocked Comlink facade in unit tests; real worker in the integration test.
- **Packager conformance unchanged.** Both the sample course and the RF training course still produce SCORM 1.2 zips structurally valid against research §3.2 rules (imsmanifest.xml at root, no __MACOSX/.DS_Store, runtime JS bundled). The RF-lesson HTML now embeds an extra React island — no new manifest requirements.
- **Cold-load budget (Phase-2 MVP goal, measured in browser via Playwright at end of Phase 3):**
  - First run on a new origin, warm HTTP cache disabled: < 30 s to first RF output.
  - Warm cache: < 5 s.

## More Information

- [ADR 0006](./0006-pyodide-in-web-worker-for-in-browser-python.md) — Pyodide + Comlink worker pattern (directly extended by this ADR).
- [ADR 0008](./0008-server-side-code-execution-fastapi-docker-gvisor.md) — server-side sandbox that hosts rf-mcp.
- [ADR 0009](./0009-reuse-rf-mcp-as-robot-framework-runner-base.md) — rf-mcp runner base. Scope narrows with this ADR: rf-mcp is the **browser-automation / server-only** path, not the only RF path.
- [ADR 0010](./0010-codemirror-6-as-primary-editor.md) — editor choice (CodeMirror 6). Phase-2 MVP uses a textarea; CodeMirror 6 is the immediate next slice.
- [ADR 0021](./0021-self-host-first-infrastructure-principle.md) — self-host-first. The `robotframework` wheel must be vendored; no runtime PyPI fetches.
- [`docs/evaluations/rf-cert-platform-reuse.md`](../evaluations/rf-cert-platform-reuse.md) — the evaluation that established Pyodide-RF viability.
- Open question: does Pyodide's IndexedDB-backed filesystem persist the installed RF package across worker restarts? If yes, post-first-install cold-start drops to ~3 s. Pending verification during implementation.
