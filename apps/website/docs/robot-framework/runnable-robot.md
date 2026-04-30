---
id: runnable-robot
title: <RunnableRobot> — in-browser Robot Framework
sidebar_position: 1
---

# `<RunnableRobot>` — in-browser Robot Framework

A React island that lets a learner edit a `.robot` file in CodeMirror, hit a
*Run* button, and see Robot Framework execute the suite **entirely in the
browser** via Pyodide. No server, no remote runner, no shared infrastructure
between learners.

```tsx
<RunnableRobot
  fileName="first_test.robot"
  caption="Edit the suite then hit Run — log.html is produced just like the CLI."
  initialCode={`*** Settings ***
Documentation    My very first Robot Framework test

*** Test Cases ***
Say Hello
  Log    Hello, Robot Framework!
  Should Be Equal    \${1 + 1}    \${2}
`}
/>
```

## What you get

- **CodeMirror 6 editor** with Robot Framework syntax highlighting and
  libdoc-driven autocomplete (~298 keywords across BuiltIn, Collections,
  String, DateTime, OperatingSystem, Process, XML).
- A **Run / Reset** toolbar.
- After running:
  - **Console output** (stdout + stderr).
  - A **stats pill** (passed / failed / skipped).
  - **Show / Download log.html** — RF's detailed log.
  - **Show / Download report.html** — RF's high-level summary.
  - **Download output.xml** — rebot-input XML for external CI tooling.

The artifacts are blob URLs constructed in the browser; nothing leaves the
SCO. Inside an LMS, the iframe embeds load via `sandbox="allow-scripts
allow-same-origin"` so RF's `sessionStorage`-backed UI state works.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `initialCode` | `string` | yes | — | The `.robot` source the learner sees |
| `fileName` | `string` | no | `'suite.robot'` | Filename inside the virtual FS |
| `caption` | `string` | no | — | Optional description rendered above the editor |
| `runLabel` | `string` | no | `'Run suite'` | Text on the run button |

Source: [`apps/docs/src/components/rf/RunnableRobot.tsx`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/components/rf/RunnableRobot.tsx).

## How it works

```
┌────────────────────────────────────────────────────┐
│ Main thread — React island                         │
│   <RunnableRobot>                                  │
│     ↓ uses                                         │
│   useRobotRunner() hook                            │
│     ↓ spawns                                       │
│   Worker(rf.worker.ts, type: 'module')             │
└────────────────────┬───────────────────────────────┘
                     │ postMessage
                     ▼
┌────────────────────────────────────────────────────┐
│ Worker thread                                       │
│   import('../pyodide/pyodide.module.js')           │
│     ↓                                              │
│   loadPyodide({ indexURL: '../pyodide/' })         │
│     ↓                                              │
│   fetch('../pyodide/wheels/                        │
│           robotframework-7.4.2-py3-none-any.whl')  │
│     ↓                                              │
│   Pyodide.FS.writeFile + micropip install          │
│     ↓                                              │
│   On run: write *.robot to /lernkit_rf_work/       │
│           run robot.run_cli([...]) via Pyodide     │
│     ↓                                              │
│   Read back log.html, report.html, output.xml      │
└────────────────────────────────────────────────────┘
```

Key files:

- **[`rf.worker.ts`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/components/rf/rf.worker.ts)** — the Pyodide worker.
- **[`useRobotRunner.ts`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/components/rf/useRobotRunner.ts)** — the hook that mediates between React and the worker.
- **[`editor/RobotFrameworkEditor.tsx`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/components/rf/editor/RobotFrameworkEditor.tsx)** — CodeMirror 6 setup.
- **[`editor/libdoc-loader.ts`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/components/rf/editor/libdoc-loader.ts)** — autocomplete data fetcher.
- **[`editor/robot-framework-language.ts`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/components/rf/editor/robot-framework-language.ts)** — RF tokenizer (StreamLanguage).

## Setup

### Pyodide vendoring

`pnpm install` runs `apps/docs/scripts/copy-pyodide.mjs` which copies
Pyodide from `node_modules/pyodide` to `apps/docs/public/pyodide/`. Astro
serves it from the same origin in dev and bundles it into the SCORM zip
when `INCLUDE_PYODIDE_RUNTIME=1` is set during packaging.

The script also writes a **companion `pyodide.module.js`** alongside
`pyodide.mjs`. Some LMS file servers don't have a `.mjs` MIME mapping and
serve it as `application/octet-stream`, which strict-MIME browsers reject for
`<script type="module">` and dynamic `import()`. The workers import the `.js`
companion so the browser sees `application/javascript` from any sane file
server.

### Robot Framework wheel

`pnpm install` runs `apps/docs/scripts/download-rf-wheels.mjs` which fetches
the pinned RF wheel into `apps/docs/public/pyodide/wheels/`. The worker
fetches it on first `init()` and installs via micropip.

### Libdoc autocomplete

`pnpm install` runs `apps/docs/scripts/download-rf-libdocs.mjs` which fetches
the libdoc JSONs for the standard libraries (BuiltIn, Collections, String,
…) into `apps/docs/public/rf-libdocs/`. The editor's libdoc-loader fetches
the `manifest.json` then each library on first autocomplete trigger.

### `import.meta.url` paths

All in-package paths derive from `import.meta.url`:

```ts
const pyodideModuleUrl = new URL('../pyodide/pyodide.module.js', self.location.href).href;
const pyodideIndexUrl  = new URL('../pyodide/', self.location.href).href;
const wheelUrl         = new URL(`../pyodide/wheels/${WHEEL}`, self.location.href).href;
```

This makes the runtime portable across any LMS sub-path mount. See
[LMS portability](/packaging/lms-portability).

## Authoring tips

- **Don't preview while learners are running.** Pyodide is heavy (~13 MB
  initial load); the first `init()` per page can take 10-15 seconds. Show
  the progress message via the `progress` field from `useRobotRunner`.
- **Keep `initialCode` short and self-contained.** Lessons benefit from a
  10-15 line example more than a 100-line one. Long suites belong in
  separate `.robot` files inside the package, loaded via fetch — but the
  in-page editor is for *exploration*, not authoring.
- **Don't use `Library  RequestsLibrary`.** Libraries with native deps don't
  work in Pyodide. Stick to BuiltIn, Collections, String, DateTime,
  OperatingSystem, Process, XML.
- **Highlight the `${1 + 1}`-style traps.** Robot's string-by-default
  variable typing is the #1 trip-up; the lesson should call it out.

## Where to go next

- **[Architecture decisions](/architecture/adrs)** — see ADRs 0006 (Pyodide),
  0009 (RF runner), 0010 (CodeMirror), 0024 (Pyodide-RF for non-browser
  lessons).
