---
id: runnable-robot
title: Runnable Robot Framework cells
sidebar_position: 6
---

# Runnable Robot Framework cells

`<RunnableRobot>` runs a real `.robot` suite **in the browser** via Pyodide
+ the bundled RF wheel. Same infrastructure as
[`<RunnablePython>`](/authoring/runnable-python), with CodeMirror's RF
grammar + libdoc autocomplete + the rebot artifact pipeline pre-wired.

```mdx
import RunnableRobot from '@/components/rf/RunnableRobot.tsx';

<RunnableRobot
  client:visible
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

What the learner sees:

- A CodeMirror editor with RF syntax highlighting + autocomplete (~298
  keywords across BuiltIn, Collections, String, DateTime, OperatingSystem,
  Process, XML).
- *Run suite* / *Reset* buttons in a toolbar below the editor.
- After running:
  - **Console output** (stdout + stderr).
  - A **stats pill**: passed / failed / skipped.
  - **Show / Download log.html** — the detailed trace.
  - **Show / Download report.html** — the high-level summary.
  - **Download output.xml** — rebot-input XML for external tooling.

For the deep technical reference (architecture, setup, vendoring), see
[`<RunnableRobot>` deep-dive](/robot-framework/runnable-robot).

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `initialCode` | `string` | yes | — | The `.robot` source the learner sees |
| `fileName` | `string` | no | `"suite.robot"` | Filename inside the virtual FS — also used as the artifact filename stem |
| `caption` | `string` | no | — | Optional description rendered above the editor |
| `runLabel` | `string` | no | `"Run suite"` | Override the run button label |

Source: [`apps/docs/src/components/rf/RunnableRobot.tsx`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/components/rf/RunnableRobot.tsx).

## A complete example

The lesson 1.4 from rf-training shows a real edit-and-run flow. Drop this
into any lesson:

```mdx
<RunnableRobot
  client:visible
  fileName="warehouse_smoke.robot"
  caption="Two tests in one file. After Run, open log.html to see [Documentation] and [Tags] rendered."
  initialCode={`*** Test Cases ***
Warehouse Arrival Is Logged
    [Documentation]    Smoke test confirming arrival is recorded.
    [Tags]             warehouse    smoke
    Log                Shift started at Munich DC

Container Weight Is Within Limit
    [Documentation]    Verifies that containers do not exceed the vessel limit.
    [Tags]             warehouse    weights
    VAR    \${weight: int}    8200
    Should Be True    \${weight} < 25000
`}
/>
```

After the learner clicks *Run suite*:

1. Pyodide boots (first run only, ~10–15 s).
2. The RF wheel installs into the in-worker filesystem (cached after first
   run).
3. The `.robot` file is written to `/lernkit_rf_work/`.
4. `robot.run_cli([...])` executes the suite.
5. `log.html`, `report.html`, `output.xml` come back as blob URLs.

## Escaping `${variable}` in MDX

RF uses `${}` and `\${}` for variable references. MDX treats `{...}` as a
JSX expression. Two safe patterns:

### Pattern 1 — backtick template with escaped `$`

```mdx
<RunnableRobot
  initialCode={`*** Test Cases ***
Greet
    Log    \${weight: int}
`}
/>
```

The escape is the backslash before `$`. JavaScript template literals
treat `\$` as a literal `$`, so RF's `${weight}` survives.

### Pattern 2 — string concatenation

For complex code, store it in a constant and pass it in:

```mdx
import RunnableRobot from '@/components/rf/RunnableRobot.tsx';

export const ROBOT_CODE = `*** Test Cases ***
Greet
    Log    \${weight: int}
`;

<RunnableRobot client:visible initialCode={ROBOT_CODE} />
```

Use whichever is easier to read.

## Editor features

The CodeMirror editor includes:

- **Syntax highlighting** for RF (StreamLanguage-based grammar; covers
  section headers, comments, settings, variables, control-flow keywords,
  keyword settings, numbers, strings).
- **Autocomplete** — Ctrl-Space (or Cmd-Space) opens the popup with
  ~298 keywords from the vendored libdocs, filtered by the prefix you
  typed. Each entry shows args + short doc.
- **Bracket matching** for `{`, `[`, `(`.
- **Active-line highlighting**.
- **Tab → 4 spaces** (preserves the 2-space-separator rule by NOT
  collapsing whitespace).
- **Undo / redo** via standard keybindings.

## What works in the in-browser runner

✅ **Pure-Python libraries.** BuiltIn, Collections, String, DateTime,
OperatingSystem, Process, XML — all work.

✅ **Standard RF features.** Test cases, keywords, settings,
variables (typed + untyped), control structures, evaluations.

✅ **Artifacts.** log.html, report.html, output.xml all generated
identically to a CLI run.

✅ **Multiple test cases per suite.**

❌ **Native libraries.** `SeleniumLibrary` and `Browser` (Playwright) need
real OS-level browsers. They don't work in Pyodide; lessons that need
them use the server-side rf-mcp runner per
[ADR 0009](/architecture/adrs/0009-reuse-rf-mcp-as-robot-framework-runner-base).

❌ **Custom libraries from disk.** The in-browser FS is virtual; learners
can't `Library    ./helpers.py` against a file outside the suite.
Single-file `.robot` only.

❌ **External services.** Pyodide can't open sockets directly. Anything
that needs an HTTP server, database, or file system outside the worker
won't work.

## What the learner can do

✅ Edit any character of `initialCode` and re-run.  
✅ Add new test cases / keywords.  
✅ See the full RF log with keyword traces.  
✅ Download artifacts and share them.  
✅ Type Robot keywords with autocomplete.  
✅ Iterate freely; nothing escapes the worker.

❌ Save changes across page reloads (the editor state is per-mount).

## Authoring tips

- **Keep `initialCode` short and self-contained.** 10–20 lines is the
  sweet spot. Long suites belong in `.robot` files inside the package,
  loaded out-of-band.
- **Highlight the gotchas.** `${1 + 1}` vs `${1+1}` (RF's whitespace
  rules); typed vs untyped variables; `Should Be Equal` vs `Should Be
  Equal As Integers`.
- **Use `<Aside>` to call out browser-only limitations.** Most RF
  tutorials assume a CLI; learners shouldn't be surprised when
  `Library    Browser` fails.

```mdx
<Aside type="note">
  This in-browser runner covers pure-Python Robot Framework libraries —
  `BuiltIn`, `Collections`, `String`, `DateTime`, `OperatingSystem`,
  `XML`, `Process`. Lessons that need `SeleniumLibrary` or `Browser`
  use the server-side rf-mcp runner.
</Aside>
```

- **Encourage the *Show log.html* button.** It's how learners see the
  per-keyword trace, which is the most powerful debugging tool RF gives
  you. Mention it in the caption.

## SCORM packaging implications

The RF runner needs Pyodide AND the RF wheel bundled in the zip. Use:

```bash
INCLUDE_PYODIDE_RUNTIME=1 \
  node apps/docs/scripts/package-scorm12.mjs
```

This bundles `apps/docs/public/pyodide/` (Pyodide core) + `pyodide/wheels/`
(RF wheel) + `rf-libdocs/` (autocomplete data) into the zip. Adds ~6.3 MB
compressed.

Without `INCLUDE_PYODIDE_RUNTIME=1`, the runner tries to fetch Pyodide from
the same origin; that works in dev but fails inside an LMS where the SCO is
mounted at an unknown sub-path with no upstream.

## Where to go next

- **[`<RunnableRobot>` deep-dive](/robot-framework/runnable-robot)** —
  architecture, vendoring, the worker, libdoc loader, syntax module.
- **[Runnable Python cells](/authoring/runnable-python)** — when you want
  raw Python without the RF layer.
- **[Code blocks](/authoring/code-blocks)** — when you just want to *show*
  RF code without running it.
