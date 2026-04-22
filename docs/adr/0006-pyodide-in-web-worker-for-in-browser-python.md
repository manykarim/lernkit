---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0006 — Run in-browser Python on Pyodide 0.29.x inside a Web Worker, self-hosted

## Context and Problem Statement

Python execution is the flagship primitive of the framework (the "Educative Code Widget" UX from research §1.3). Many lessons — especially introductory ones —
should not require a server round-trip for every cell run. We need an in-browser Python runtime that:

- ships Python 3 stdlib and the numerical stack (numpy, pandas, scipy, scikit-learn, matplotlib, Pillow, sqlite3),
- runs off the main thread so `while True:` does not freeze the UI,
- cleanly supports `input()`, `KeyboardInterrupt`, and synchronous `time.sleep` when the hosting page opts into cross-origin isolation,
- persists the Python namespace across cells for notebook-style lessons,
- loads fast on repeat visits and is cacheable under SCORM constraints (the SCORM package itself does not ship the wasm, but the host site does),
- does not depend on any third-party CDN at runtime.

## Decision Drivers

- **Single mature option in the ecosystem.** Pyodide (Mozilla / Pyodide community, MPL 2.0) is the only browser Python runtime that ships numpy/scipy/pandas
  wasm wheels. MicroPython-WASM is too limited; Skulpt is pedagogical-only; Brython is interpreter-in-JS and too slow for anything numerical.
- **CDN risk.** jsDelivr has had real outages; a training course failing because jsDelivr is slow is unacceptable. Also: CSP friction in enterprise LMS
  contexts forbids third-party script sources.
- **UX responsiveness.** Running Python on the main thread freezes the page on any CPU-bound snippet; we must use a Web Worker.
- **Sync Python features need SAB.** `input()`, `KeyboardInterrupt`, blocking `time.sleep`, and synchronous `FS.syncfs` all require `SharedArrayBuffer` +
  `Atomics.wait`, which in turn require cross-origin isolation headers (COOP: same-origin + COEP: require-corp).
- **Site-wide COOP/COEP breaks embeds.** Turning on isolation at the root path breaks YouTube, Vimeo, Sandpack, and many third-party widgets — so isolation
  must be scoped (see ADR 0019).
- **Cold-start cost.** 6–10 MB compressed wasm + stdlib; 10–30 seconds over a slow connection without aggressive caching.

## Considered Options

- **A:** Pyodide 0.29.x, self-hosted at `/static/pyodide/v0.29.3/`, Web Worker via Comlink (async) as default; upgrade to Coincident + SharedArrayBuffer on
  COOP/COEP isolated pages.
- **B:** Pyodide from jsDelivr CDN, main-thread only.
- **C:** MicroPython-WASM as primary, Pyodide only for numerical lessons.
- **D:** No in-browser Python — everything runs server-side via the FastAPI sandbox (ADR 0008).

## Decision Outcome

Chosen option: **A — Pyodide 0.29.x self-hosted, Web Worker by default with Comlink; Coincident + SharedArrayBuffer on cross-origin-isolated pages scoped to
the `/run/*` route (ADR 0019).**

### Runtime policy

- **Version pinned** at 0.29.x (CPython 3.13). Upgrading Pyodide is an ADR-triggering change because it can break `micropip` resolution and wasm-wheel
  availability.
- **Self-hosted.** Served from `/static/pyodide/v0.29.3/` with `Cache-Control: public, max-age=31536000, immutable` and a content hash in the URL. Never
  depends on jsDelivr in production (latency, outage risk, CSP friction, version drift — research §4.1).
- **Web Worker, always.** Main-thread Pyodide is forbidden even on small cells; a `while True:` bug from a learner must not brick the UI.
- **Comlink async-only by default.** Works on every page without isolation headers.
- **Coincident + SharedArrayBuffer upgrade** only on pages that ship under `/run/*` with COOP/COEP set (ADR 0019). Enables `input()`, `KeyboardInterrupt` via
  `pyodide.setInterruptBuffer`, and blocking synchronous calls.
- **Preload.** `<link rel="preload" as="fetch" crossorigin>` the wasm + pyodide.js on the course landing page so the first lesson cell is warm.
- **Service worker pre-cache** of the Pyodide blob on course enter — makes the second learner visit a cache hit and survives LMS-iframe-reloads.
- **State persistence.** One Pyodide instance per runner tab; `py.globals` shared across cells in a `cellGroup="<id>"`; per-cell isolated namespace for cells
  marked `cellGroup="__isolated__"`.
- **I/O.** `pyodide.setStdout({ batched })` / `setStderr` with throttled streaming to the UI. Matplotlib uses `matplotlib_pyodide.html5_canvas_backend`.
- **Filesystem.** IDBFS mount + `FS.syncfs` for lesson-local persistence (debounced writes).
- **HTTP.** `requests` is broken in browser — document `pyodide.http.pyfetch` or the `pyodide-http` shim as the Pythonic entry point.

### Explicit non-goal

**Robot Framework runs in Pyodide for installability only.** `micropip.install("robotframework")` works because RF core is pure Python. But SeleniumLibrary,
Browser library, SSHLibrary, OperatingSystem (beyond `/tmp`) do not work in WASM. In-browser RF is **experimental** — the server-side sandbox (ADR 0008 +
0009) is the canonical RF runner.

### Consequences

- **Performance, mixed:** first load is 6–10 MB compressed; mitigated by self-host + preload + service worker pre-cache + immutable caching. Steady-state
  CPU-bound pure-Python is 3–10× slower than native; acceptable for lessons, unacceptable for production training datasets.
- **Usability, good:** no server round-trip for Python cells makes the primary UX snappy. State persists notebook-style.
- **Security, good:** wasm sandbox + Web Worker sandbox + no network-FS access by default. Worker terminates on cell reset.
- **Portability, good:** runs in every modern browser; the same Pyodide blob serves all courses across all hosting domains.
- **Portability, bad:** requires careful COOP/COEP scoping (ADR 0019) or the fast sync features (`input()`, `KeyboardInterrupt`) are unavailable.
- **Clarity, bad:** two execution modes (Comlink async / Coincident sync) complicate internal code — abstracted behind a single `PyRunner` worker API so
  components don't see the seam.

## Pros and Cons of the Options

### A — Self-host Pyodide 0.29.x + Web Worker + conditional Coincident

- Good: self-hosting eliminates CDN risk and CSP friction for enterprise LMS contexts.
- Good: Web Worker from day one avoids "why does my UI freeze" bug reports forever.
- Good: Coincident upgrade is additive; non-isolated pages still work with Comlink async.
- Bad: self-host asset storage and cache-control discipline is the authoring team's responsibility.

### B — jsDelivr CDN + main thread

- Bad: runtime dependency on a third-party CDN — research explicitly disqualifies this.
- Bad: main-thread execution freezes UI on CPU-bound snippets.

### C — MicroPython-WASM primary

- Bad: no numpy, pandas, scipy wasm wheels — eliminates data-science lessons.
- Good: tiny (~300 KB vs 6–10 MB) — consider as a **future "lightweight mode"** on mobile/constrained networks (research §10 Risk #6). Not the default.

### D — Everything server-side

- Bad: every code cell is a network round-trip. Introductory lessons feel sluggish.
- Bad: forces a server dependency even for a plain-HTML / offline-SCORM course.
- Good: still needed for polyglot, server-only packages, and RF browser automation — hence ADR 0008, not instead of it.

## Validation

- **Cold-start budget:** a 10-cell Python lesson loads in <3 seconds on a cold cache over a consumer broadband connection (research §Phase 2 success metric).
  CI measures this with a Playwright script that clears the cache, navigates to the lesson, and times first-cell-ready.
- **Worker isolation:** a deliberate `while True: pass` in a cell leaves the page responsive; the runner auto-terminates the worker after the cell's
  wall-clock budget.
- **State persistence:** two cells sharing `cellGroup="chapter-3"` share `py.globals`; two cells with different groups do not.
- **SharedArrayBuffer only under isolation:** the test harness runs under both isolated (`/run/*`) and non-isolated (`/lessons/*`) routes and verifies
  `Atomics.wait`-dependent features fall back to async with no stack traces.
- **No third-party CDN requests** in devtools during a cell run (verified by Playwright network interception).

## More Information

- Research §4.1 "Python in browser — Pyodide, self-hosted, in a Web Worker".
- Research §10 Risk #5 (COOP/COEP trade-off) and Risk #6 (cold-start mitigation).
- Pyodide docs: https://pyodide.org/.
- Related ADRs: 0008 (server-side sandbox — the canonical runner for anything Pyodide can't do), 0019 (scoped COOP/COEP), 0015 (packaging pipeline).
- Open question: if MicroPython-WASM gains numpy wheels, we may add it as the mobile-lightweight mode. Today: not viable.
