/// <reference lib="webworker" />
/**
 * Pyodide runner — Web Worker.
 *
 * Runs CPython 3.13 via Pyodide 0.29.3 (wasm) in a dedicated worker so the
 * main thread stays responsive during package loads and long evaluations.
 * Exposes a Comlink-wrapped API to the `useRunner()` hook.
 *
 * Self-host strategy (ADR 0006):
 *  - Pyodide assets live at `/pyodide/*` (copied from `node_modules/pyodide/`
 *    by `scripts/copy-pyodide.mjs` at pre-build / pre-dev).
 *  - At runtime, the worker dynamically imports `pyodide.mjs` via a URL
 *    resolved against its own `self.location.href`. This is critical inside
 *    SCORM iframes: LMSes mount content at arbitrary URL prefixes; absolute
 *    `/pyodide/...` paths hit the LMS host root, not the package root.
 *  - `loadPyodide({ indexURL })` likewise uses a relative-to-worker path so
 *    Pyodide can find its sibling `pyodide.asm.wasm` / `python_stdlib.zip`.
 *
 * Not supported in this version (MVP):
 *  - `input()` and blocking calls (require COOP/COEP + SharedArrayBuffer).
 *  - Interrupts (would use `pyodide.setInterruptBuffer`).
 *  - On-demand package loading from a CDN (we ship a stdlib-only bundle).
 */

import * as Comlink from 'comlink';

declare const self: DedicatedWorkerGlobalScope;

// Pyodide's module shape is loose — we intentionally don't pull in @types/pyodide
// because dynamic-import is the boundary. Keep the surface we use minimal.
type PyodideLike = {
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(opts: { batched: (s: string) => void }): void;
  setStderr(opts: { batched: (s: string) => void }): void;
};

export interface RunResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly result: unknown;
  readonly error?: {
    readonly type: string;
    readonly message: string;
    readonly traceback: string;
  };
  /** Wall-clock execution time, milliseconds. */
  readonly elapsedMs: number;
}

let pyodidePromise: Promise<PyodideLike> | null = null;

async function boot(): Promise<PyodideLike> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    // Resolve the pyodide ESM module URL relative to the worker's own location.
    // The worker script ships under /_astro/ (hashed), but the pyodide assets
    // live at /pyodide/ alongside /_astro/ — so we go up one directory then into pyodide/.
    const pyodideModuleUrl = new URL('../pyodide/pyodide.mjs', self.location.href).href;
    const pyodideIndexUrl = new URL('../pyodide/', self.location.href).href;

    // Vite must NOT try to resolve this dynamic import at build time — it's a
    // runtime URL, not a bundler graph node. `@vite-ignore` suppresses the warning.
    const mod = (await import(/* @vite-ignore */ pyodideModuleUrl)) as {
      loadPyodide(opts: { indexURL: string }): Promise<PyodideLike>;
    };
    return mod.loadPyodide({ indexURL: pyodideIndexUrl });
  })();
  return pyodidePromise;
}

const api = {
  /** Preload the runtime without running user code. Useful for warm-start buttons. */
  async ready(): Promise<void> {
    await boot();
  },

  /**
   * Run a snippet of Python. Returns captured stdout/stderr, the result value,
   * and any thrown exception serialised from the Python side.
   */
  async run(code: string): Promise<RunResult> {
    const py = await boot();
    let stdout = '';
    let stderr = '';
    py.setStdout({ batched: (s: string) => (stdout += `${s}\n`) });
    py.setStderr({ batched: (s: string) => (stderr += `${s}\n`) });

    const start = performance.now();
    try {
      const result = await py.runPythonAsync(code);
      const elapsedMs = performance.now() - start;
      // pyodide's PyProxy objects are transferable via their `.toJs()` method; if absent
      // (plain JS value) we return it directly. Strings/numbers/bool round-trip fine.
      const materialised =
        result && typeof (result as { toJs?: () => unknown }).toJs === 'function'
          ? (result as { toJs: () => unknown }).toJs()
          : result;
      return { stdout, stderr, result: materialised, elapsedMs };
    } catch (e) {
      const elapsedMs = performance.now() - start;
      const err = e as { name?: string; message?: string; stack?: string };
      return {
        stdout,
        stderr,
        result: undefined,
        error: {
          type: err.name ?? 'Error',
          message: err.message ?? String(e),
          traceback: err.stack ?? '',
        },
        elapsedMs,
      };
    }
  },
};

export type PyRunnerApi = typeof api;

Comlink.expose(api);
