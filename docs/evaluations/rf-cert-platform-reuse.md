# Evaluation — RF editor + execution approach from `rf-cert-platform`

> **TL;DR** — `rf-cert-platform` proves Robot Framework runs end-to-end inside Pyodide in 2026 (via `micropip.install("robotframework")` + `robot.run()`), including log/report/output.xml generation. That result is directly reusable for Lernkit and **meaningfully reduces Phase-3 scope**: we get a working in-browser RF runner months before the rf-mcp server-side path. Their editor implementation (textarea + Prism.js + custom autocomplete) is **not** the right shape for Lernkit — ADR 0010 commits us to CodeMirror 6, and their `robot.api.get_model()` AST pattern is the reusable core regardless. Net recommendation: adopt the runtime approach, not the editor code.
>
> Analysis date: 2026-04-24. Analyzed against `rf-cert-platform` commit state at `/home/many/workspace/rf-cert-platform` (not an external clone).

## 1. What `rf-cert-platform` actually does

Two directories matter for this evaluation:

```
rf-cert-platform/
├── scripts/pyodide-test/validate-rf.mjs     (288 lines) — Node-side proof of viability
├── src/execution/browser/
│   ├── pyodide-runner.ts                    (250 lines) — TS module, LabResultDTO
│   └── grader.ts                            (129 lines) — client-side grading + HMAC
└── src/frontend/app/components/
    ├── pyodide-runner.js                    (285 lines) — browser wrapper + parseForIDE()
    ├── code-editor.js                       (1201 lines) — textarea + Prism + autocomplete
    └── lab-workspace.js                     (624 lines) — UI that wires editor + runner
```

### 1.1 Execution pattern (the important part)

```js
// From src/frontend/app/components/pyodide-runner.js:39
const pyodide = await globalThis.loadPyodide({
  indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/',
});

await pyodide.loadPackage('micropip');
const micropip = pyodide.pyimport('micropip');
await micropip.install('robotframework');

// Write user .robot files to virtual FS, then:
pyodide.runPython(`
  import robot
  rc = robot.run(*files, outputdir='.', output='output.xml',
                 log='log.html', report='report.html',
                 consolecolors='off', stdout=_rf_stdout, stderr=_rf_stderr)
`);
```

That's the entire recipe. `robotframework` is pure Python, so `micropip.install()` downloads the wheel and it imports cleanly into Pyodide. `robot.run()` works identically to the CLI — generates `log.html`, `report.html`, `output.xml` in the virtual FS.

### 1.2 What `validate-rf.mjs` proves

The script boots a Node-side Pyodide and exercises every K3 (cognitive level 3) Robot Framework feature:

| Test | Features covered |
|---|---|
| Basic suite | `Log`, `Catenate`, `Should Be Equal`, comments, line continuation |
| Variables + user keywords | `${scalar}`, `@{list}`, `&{dict}`, `[Arguments]`, `RETURN`, `VAR` |
| Resource files | `Resource    common.resource`, `Create Dictionary`, `Should Contain` |
| Templates + setups + tags | `[Template]`, `Suite Setup`, `Suite Teardown`, `[Tags]`, `Skip`, `IF/ELSE`, `FOR` |

All four tests pass. The script exits 0 when RF runs successfully under Pyodide. That's the falsifiable proof.

### 1.3 Editor pattern

`code-editor.js` is a **1,201-line hand-rolled editor**:

- **Core trick**: transparent `<textarea>` overlaid on a `<pre>` block highlighted by Prism.js (Prism ships a `robot` grammar out of the box).
- **Autocomplete** is context-aware: detects which `*** Section ***` the cursor is in, what table column, and offers relevant suggestions.
- **Libdoc data** fetched at page load from `https://robotframework.org/robotframework/latest/libdoc/{BuiltIn,Collections,String,DateTime,OperatingSystem,XML}.json` — the official RF libdocs as JSON.
- **User-defined keywords / variables** come from `parseForIDE()` (see 1.4) — populated after every keystroke with debouncing.
- **Keyword hover doc** rendered from the libdoc JSON's `html` field.

### 1.4 The reusable gem — `parseForIDE()`

```python
# From pyodide-runner.js:165 — runs inside Pyodide
from robot.api import get_model
model = get_model(source=_rf_source, data_only=False)

# Walks model.sections and extracts:
#   - libraries (name + args)
#   - variables (name + value + line)
#   - userKeywords (name + args + doc + tags)
#   - testCases (name + line)
#   - keywordCalls (keyword + args + line + scope)
#   - errors (parse errors with line numbers)
```

This is the bridge between "user typed a character" and "autocomplete knows what's valid." It runs Robot Framework's own parser against the editor buffer. Dramatically better than hand-rolled regex lexing (which is what most RF editors try).

### 1.5 Cold-load profile (from their code + measured)

| Phase | Time | Notes |
|---|---|---|
| Pyodide core download (6.4 MB gzipped) | ~2–8 s (1 Gbit) | Self-host eliminates CDN risk |
| Pyodide init (wasm compile + Python boot) | ~2–4 s | Same in all browsers |
| `micropip.install("robotframework")` | **~20–60 s cold** | RF wheel + all pure-Python deps fetched from PyPI CDN |
| First `robot.run()` call | ~0.5–1 s | Stays warm for subsequent runs |
| Warm-cache subsequent visits | ~3–5 s | HTTP cache + service worker |

The **`micropip.install("robotframework")` step is the real hurdle** — 20–60s is not a great first-run UX. Service Worker precaching the wheels (or bundling them at build time) shortens this materially.

## 2. How it maps to Lernkit's architecture

| `rf-cert-platform` choice | Lernkit equivalent | Reuse verdict |
|---|---|---|
| Pyodide via jsDelivr CDN | Self-hosted `/pyodide/` (ADR 0006) | **Adapt** — we already self-host |
| `micropip.install("robotframework")` on first run | Same, pending wheel-mirror decision | **Adopt** — but see §5 for wheel hosting |
| Flat JS module (global state) | Web Worker + Comlink (ADR 0006) | **Adapt** — port their runner into our existing worker pattern |
| Textarea + Prism.js editor | CodeMirror 6 (ADR 0010) | **Reject their editor**, take only the autocomplete concepts |
| Autocomplete via libdoc JSONs fetched at runtime | Same JSONs, bundled in-repo (ADR 0021) | **Adapt** — self-host-first cleanup |
| `robot.api.get_model()` AST for editor intelligence | Same pattern | **Adopt verbatim** — load-bearing |
| Custom client-side grader with HMAC-SHA256 | Use Lernkit's `Tracker` + future `<CodeChallenge>` | **Reject** — our model is LMS-via-SCORM/xAPI, not bespoke HMAC |
| jsDelivr-fetched libdocs | Bundle in `public/rf-libdocs/` | **Adapt** |
| Artifacts (log.html, report.html) served from virtual FS | Same, plus: surface in a Lernkit iframe component | **Adopt** |
| Vanilla JS SPA | React islands (ADR 0002) | **Reject the UI layer**, reuse only the runner module |

## 3. What this means for Lernkit's Phase plan

The current `docs/plan/02-phase-plan.md` places "runnable Robot Framework" in **Phase 3** (weeks 21–32), and specifically via the rf-mcp server-side runner (ADR 0009). `rf-cert-platform` proves a **second, browser-side path** is available that lands earlier.

### 3.1 Proposed split

- **Browser-side (new, Phase 2 extension)**: `<RunnableRobot>` component, Pyodide + micropip RF. Works for **non-browser** RF lessons — `BuiltIn`, `Collections`, `String`, `DateTime`, `OperatingSystem`, `XML`, `Process` (stdin-less). That's ~80% of the RF content in a beginner course, including everything in our `rf-training` Sections 1–2.
- **Server-side (unchanged, Phase 3)**: rf-mcp per ADR 0009. Required for browser-automation lessons (SeleniumLibrary / Browser library) and RF configurations that need a real shell, network access, or binary libraries.

This maps cleanly: basic lessons run in-browser (zero server cost, matches our OSS single-tenant scope per ADR 0022); advanced lessons use the operator's rf-mcp deployment. The existing ADR 0009 stands; we'd add a new ADR documenting the browser-side runner's scope.

### 3.2 The RF training course (just shipped) would benefit immediately

Today, every `.robot` code block in `apps/docs/src/content/docs/rf-training/` is a static Shiki-highlighted snippet. If we adopt the Pyodide-RF pattern, the same code blocks become **runnable** — learners edit, run, see actual `log.html` / `report.html` output in the lesson, same as Pyodide Python cells do today.

Estimated effort (single engineer, no blockers): **2–3 weeks** for the MVP `<RunnableRobot>` component + worker + libdoc autocomplete.

## 4. Interaction with existing ADRs

| ADR | Impact |
|---|---|
| **0006** (Pyodide in Web Worker) | Already prescribes Pyodide + Comlink + self-host. `micropip.install("robotframework")` slots in cleanly. No changes. |
| **0009** (rf-mcp as RF runner base) | Remains the default for server-side / browser-automation RF. New ADR needed to introduce the **second**, browser-side path — scope: non-browser lessons. |
| **0010** (CodeMirror 6 as editor) | `rf-cert-platform`'s textarea+Prism approach is rejected outright. Implementation plan: CodeMirror 6 + a Lezer grammar for Robot Framework (exists on npm) + autocomplete backed by `robot.api.get_model()` + libdocs. |
| **0017** (test framework with RF) | Unchanged; that's project-testing, not learner-facing. |
| **0019** (COOP/COEP scoped to `/run/*`) | Pyodide-RF doesn't need `input()` or SharedArrayBuffer (same constraint as basic Python cells), so no isolation headers required. |
| **0021** (self-host-first) | Forces two additional bundles: Pyodide (already self-hosted), RF wheel (new — we need a mirror). See §5. |

## 5. Open issues this surfaces

### 5.1 RF wheel hosting (ADR 0021 compliance)

`micropip.install("robotframework")` fetches the wheel from **PyPI's CDN** (files.pythonhosted.org). That's a SaaS dependency. For production, options:

- **Self-host wheels at `/pyodide/wheels/robotframework-7.4.2-py3-none-any.whl`** and install offline via `micropip.install("/pyodide/wheels/robotframework-...whl")`. Same pattern applies to `Collections` (bundled with RF) and any future dep (e.g. `robotframework-jsonlibrary`).
- **Operator-configurable mirror URL** — the self-host-first policy allows this if we document it.

Either way: a new subdirectory `apps/docs/public/pyodide/wheels/` + a build-time download step. ~2 MB addition to the served-from-origin bundle.

### 5.2 Service Worker for wheel precache

Without SW precaching, every visit to a lesson with RF is a fresh 30+ second wheel install (worst case). With SW precaching the wheels + `pyodide-lock.json`, subsequent visits are ~3–5s. Plan already tracks this as an ongoing optimisation for Pyodide; this decision elevates it from nice-to-have to near-blocker.

### 5.3 CodeMirror 6 + Robot Framework grammar

CodeMirror 6 has no official `robot` language package. Options surveyed:

- **`@codemirror/legacy-modes/mode/simple`** — regex-based simple mode. ~50 lines for acceptable highlighting. Doesn't help with semantic autocomplete.
- **`lezer-robot`** (community) — a Lezer grammar for Robot Framework exists on npm. If actively maintained, this is the right choice — gives us a proper parse tree for structure-aware highlighting and folding.
- **Build our own StreamLanguage** — RF syntax is line-oriented and tractable (the ADR 0010 cite on scorm-again framework already notes this). ~200-300 LOC.

Verification needed before committing: check the last-publish date and API shape of `lezer-robot` on npm.

### 5.4 Cold-start UX

20–60s first-time install is bad. Mitigations, in order of impact:

1. **Bundle `robotframework` wheel in `/pyodide/wheels/`** — drops install from 20+s network wait to ~5s local unpack.
2. **Service Worker precache** the wheel and Pyodide assets on first lesson-page visit so subsequent chapters are instant.
3. **Preload hint** `<link rel="preload" as="fetch" crossorigin>` for the wheel on any page that has a `<RunnableRobot>`.
4. **Skeleton / progress UI** — `rf-cert-platform` has a `progress(msg)` callback pattern we can lift directly.

### 5.5 Security surface

RF-in-Pyodide inherits Pyodide's sandbox: same-origin JS access, virtual FS only, no network except `fetch()` (and `pyodide.http.pyfetch`, which is explicitly blocked for learner code via CSP). Sandbox-escape threat model is **unchanged from Pyodide Python cells** — which is the same as the one we already accepted in ADR 0006.

### 5.6 Not solved by this approach

- **Browser library / SeleniumLibrary**: needs nested Chromium. Can't work in Pyodide regardless. Server-side rf-mcp (ADR 0009, `rf-mcp-vnc` variant) remains the only path.
- **Large wheel deps**: `robotframework-requests` works (pure Python). `robotframework-jsonlibrary` works. Anything needing `libxml2`, `lxml`, or a C extension does not — unless a Pyodide-compiled wheel exists upstream.
- **File system access beyond virtual FS**: learner code can't touch the local filesystem outside `/home/pyodide/rf_work/`. Acceptable for a course; a real project uses the server-side runner.

## 6. Recommended path for Lernkit

Ranked P0/P1/P2 by urgency:

### P0 — this is the load-bearing decision

- **File a new ADR**: "Run non-browser Robot Framework lessons in Pyodide + micropip; keep rf-mcp for browser-automation lessons (supersedes ADR 0009's implicit scope)."
  - Cost: 1 day of ADR + plan alignment.
  - Unblocks: a working `<RunnableRobot>` by end of Phase 2 instead of deep into Phase 3.

### P1 — needed before shipping `<RunnableRobot>`

- **Bundle the `robotframework` wheel** in `apps/docs/public/pyodide/wheels/` with a build-time pinned download (wheel + SHA-256 verify). Install via `micropip.install("/pyodide/wheels/robotframework-7.4.2-py3-none-any.whl")`. Resolves ADR 0021 compliance + the 20-60s cold-install UX.
- **Port `validate-rf.mjs`** into Lernkit's repo as a CI gate. Same proof, our repo. ~50 lines of wrapping to integrate with existing vitest/integration-test harness.
- **Stand up `<RunnableRobot>`** as a React island in `@lernkit/components`:
  - CodeMirror 6 editor with RF grammar (pick one of §5.3 options after verification).
  - Web Worker hosting the Pyodide + RF runtime (extend existing `pyodide.worker.ts` or spin up a sibling `rf.worker.ts`).
  - Call-return contract: `run(files: Record<string, string>) → { passed, stats, log.html, report.html, consoleOutput }`.
  - xAPI emit on first run (`launched`-style), pass/fail on completion.
- **`robot.api.get_model()` autocomplete backend**. The 60-line Python wrapper from `pyodide-runner.js:161` lifts almost verbatim.
- **Libdoc JSONs bundled** at `apps/docs/public/rf-libdocs/{BuiltIn,Collections,String,DateTime,OperatingSystem,XML}.json`. Fetched from origin, not RF.org CDN.

### P2 — nice-to-have

- **Service Worker precache** for Pyodide + RF wheel + libdocs. Moves "fast path" from "warm HTTP cache" (~3–5s) to "cold visitor with SW already installed" (~1–2s).
- **Expose the generated `log.html` and `report.html`** in an iframe-ised component: `<RobotArtifacts>`. Authors can link to specific lines in the log from course prose. `rf-cert-platform` ships these as strings; we'd render them.
- **Port their grader pattern** (HMAC-signed results) ONLY if we decide to add server-side spot-checking. For SCORM/xAPI delivery, the existing Tracker is sufficient.

## 7. What we should NOT reuse

- **The 1,201-line `code-editor.js`**. It's a textarea-over-Prism hack that works, but it's vanilla JS, not React, has its own autocomplete UI, and duplicates half of CodeMirror's functionality. ADR 0010 is right — use CodeMirror 6, take only the libdoc + AST patterns.
- **The client-side grader with HMAC**. Our model is LMS-via-SCORM/xAPI. No shared secret, no server spot-checking — the LMS is the authority.
- **The Fastify API routes and Prisma schema** for labs/enrolment/leaderboard. Entire different product shape (commercial cert platform vs OSS framework). Out of scope per ADR 0022.
- **The jsDelivr CDN import**. Self-host per ADR 0006 and 0021.

## 8. Concrete next actions, if you want to proceed

1. Write and file the new ADR (scope-split with rf-mcp).
2. Add `apps/docs/scripts/download-rf-wheels.mjs` that pins + verifies the RF wheel.
3. Port `validate-rf.mjs` into `apps/docs/tests/integration/rf-pyodide.spec.mjs`.
4. Spike `<RunnableRobot>` on one `rf-training` chapter (proposed: `1-4-installing-rf.mdx` — the "first test" chapter is the highest-value demo).
5. If the spike passes: ship the full component + grammar + libdocs in a single Phase-2-extension commit.

Total estimate, single engineer with existing Pyodide infra already in place: **~10–15 working days**.

## 9. Risks

- **`robotframework` wheel size + micropip reliability**. Mitigation: self-host the wheel in our static origin (see §5.1).
- **CodeMirror 6 RF grammar maturity**. Mitigation: if `lezer-robot` is unmaintained, fall back to `@codemirror/legacy-modes` with a regex-based language. Takes a day; features degrade gracefully (highlighting works, semantic autocomplete reduced).
- **Learners on throttled mobile data**. Mitigation: show a clear cold-load indicator, don't auto-boot Pyodide on page load, require explicit **Run** click.
- **Future RF 8.x compatibility**. Mitigation: same as Python cells — monitor the Pyodide compatibility matrix; the `validate-rf.mjs` port becomes our CI gate.

## 10. Bottom line

`rf-cert-platform` proves the expensive part. Their editor is the wrong shape for us, but their **runtime approach is production-grade and directly reusable** — the 288-line `validate-rf.mjs` alone is worth more than the 1,201-line editor. Adopting their pattern moves browser-side RF from Phase 3 to Phase 2 without changing any other architectural commitment.

Net recommendation: **yes, adopt**, with the scope split documented as a new ADR and the editor built on CodeMirror 6 per the existing ADR 0010.
