---
id: runnable-python
title: Runnable Python cells
sidebar_position: 5
---

# Runnable Python cells

`<RunnablePython>` embeds a CodeMirror editor + a *Run* button + an output
panel directly in a lesson. Python runs **in the browser** via Pyodide
(WebAssembly), so there's no server round-trip and no shared state across
learners.

```mdx
import RunnablePython from '@/components/pyodide/RunnablePython.tsx';

<RunnablePython
  client:visible
  caption="Edit and run — your changes don't leave the browser."
  initialCode={`name = "world"
print(f"Hello, {name}!")
`}
/>
```

What the learner sees:

- A code editor with the `initialCode` pre-filled.
- A *Run* button (or your `runLabel` override).
- A status indicator while Pyodide boots / the snippet runs.
- After Run: stdout and stderr panels, plus exception traceback if Python
  raised.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `initialCode` | `string` | yes | — | The Python source the learner sees |
| `caption` | `string` | no | — | Short description rendered above the editor |
| `runLabel` | `string` | no | `"Run"` | Button label override (e.g. "Fit model") |

Source: [`apps/docs/src/components/pyodide/RunnablePython.tsx`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/components/pyodide/RunnablePython.tsx).

## How it works

```
┌─────────────────────────────────────────────────────┐
│ Main thread — React island                          │
│   <RunnablePython>                                  │
│     ↓ uses                                          │
│   useRunner() hook                                  │
│     ↓ spawns                                        │
│   Worker(pyodide.worker.ts, type: 'module')         │
└────────────────────┬────────────────────────────────┘
                     │ postMessage
                     ▼
┌─────────────────────────────────────────────────────┐
│ Worker thread                                        │
│   import('../pyodide/pyodide.module.js')            │
│     ↓                                               │
│   loadPyodide({ indexURL: '../pyodide/' })          │
│     ↓                                               │
│   On run:                                            │
│     captureStdoutStderr()                           │
│     pyodide.runPython(code)                         │
│     return { stdout, stderr, error? }               │
└─────────────────────────────────────────────────────┘
```

Key files:

- **[`pyodide.worker.ts`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/components/pyodide/pyodide.worker.ts)** — the Pyodide worker.
- **[`useRunner.ts`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/components/pyodide/useRunner.ts)** — the React hook that mediates between island and worker.

## First-run cost

Pyodide is ~13 MB (WASM + stdlib). The first `Run` click on a page boots
Pyodide; expect 2–5 s on a warm cache, longer on cold. Subsequent runs are
fast (50–200 ms for small snippets).

The component shows status messages during boot:

> *Loading Pyodide…*  
> *Pyodide ready.*  
> *Running…*  
> *Done.*

So the learner knows what's happening.

## Examples

### Simple expression

```mdx
<RunnablePython
  client:visible
  initialCode={`# Try changing the operator
print(2 ** 8)
`}
/>
```

### Multi-line script

```mdx
<RunnablePython
  client:visible
  caption="Pure functions, no I/O — fast on every run."
  initialCode={`def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

for i in range(10):
    print(f"fib({i}) = {fib(i)}")
`}
/>
```

### Stdin / input — not yet

`input()` doesn't work in Pyodide-in-worker yet because it's a synchronous
blocking call and the worker has no terminal. Stub it for the lesson:

```mdx
<RunnablePython
  client:visible
  initialCode={`# In a real terminal you'd use input(). Here, hardcode:
name = "Robot"
print(f"Hello, {name}!")
`}
/>
```

The framework's runner roadmap includes COOP/COEP-page support that
unblocks `input()` (Phase 3 per the source's notes). Until then, this
limitation is real.

### Imports from the standard library

Most pure-Python stdlib modules work:

```mdx
<RunnablePython
  client:visible
  initialCode={`from collections import Counter

words = "the quick brown fox jumps over the lazy dog".split()
counts = Counter(words)
print(counts.most_common(3))
`}
/>
```

### Imports from third-party packages

Pyodide can `pip`-install pure-Python wheels and a curated set of native
packages (numpy, pandas, scipy, etc.). The base bundle doesn't include
them — you'd `await pyodide.loadPackage('numpy')` from JS first. The
current `RunnablePython` MVP doesn't expose this; for now, stick to the
stdlib. If you need numpy/pandas/etc. in a lesson, file an issue.

### Long-running cell

```mdx
<RunnablePython
  client:visible
  runLabel="Fit model"
  initialCode={`import time
print("Training…")
time.sleep(2)
print("Done.")
`}
/>
```

The button label changes from *Run* to *Fit model*. While running, the
button shows *Running…* and is disabled.

## What the learner can and can't do

✅ Edit any character of `initialCode` and re-run.  
✅ Use any pure-Python stdlib module.  
✅ See full traceback on errors.  
✅ See stdout and stderr in separate panels.  
✅ Iterate freely — runs are sandboxed; nothing escapes the worker.

❌ Use `input()` (deferred to Phase 3).  
❌ Persist state across page reloads (deferred).  
❌ Fetch arbitrary URLs without CORS shenanigans (use `pyodide.loadPackage` for known mirrors).  
❌ Spawn subprocesses, open sockets, or write to disk (Pyodide is
sandboxed).

## Authoring tips

- **Show `print` output, not return values.** Pyodide doesn't echo the
  last expression (no REPL). Wrap the interesting value in a `print(...)`
  so the learner sees something.
- **Keep snippets to ~20 lines.** Longer snippets feel like cheating in
  a lesson; if you need 50 lines of setup, it belongs in a real
  notebook, not a lesson cell.
- **Surface the gotchas.** Python's `0.1 + 0.2 == 0.3 → False` is
  perfect cell material. So is `[1, 2] == [1.0, 2.0] → True` (type
  coercion).
- **Don't `import os` and ask learners to do filesystem things.**
  Pyodide's filesystem is virtual; `os.listdir('/')` shows Pyodide's
  internal layout, which is a distraction.
- **Consider replacing with [`<RunnableRobot>`](/authoring/runnable-robot)** if your
  lesson is about Robot Framework specifically. RF in Pyodide gives the
  learner real RF semantics (test cases, keywords, log.html /
  report.html).

## SCORM packaging implications

Pyodide is heavy. By default the SCORM zip excludes Pyodide; the runner
falls back to fetching it from the same origin (which fails in a
zero-network LMS). To bundle Pyodide for offline-capable LMS delivery:

```bash
INCLUDE_PYODIDE_RUNTIME=1 \
  node apps/docs/scripts/package-scorm12.mjs
```

This adds ~6.3 MB compressed to the zip. See [SCORM 1.2 packaging](/packaging/scorm12)
for the full surface.

## Where to go next

- **[Runnable Robot Framework cells](/authoring/runnable-robot)** — full RF
  in-browser via the same Pyodide infrastructure, but with the RF wheel +
  CodeMirror's RF grammar pre-wired.
- **[Code blocks](/authoring/code-blocks)** — when you only need to *show*
  Python, not run it.
