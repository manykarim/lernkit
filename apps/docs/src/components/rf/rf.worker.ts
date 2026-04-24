/// <reference lib="webworker" />
/**
 * Robot Framework runner — Web Worker.
 *
 * Extends the Pyodide worker pattern (ADR 0006) to install Robot Framework
 * from a **self-hosted wheel** (ADR 0021 / ADR 0024) and execute `.robot`
 * files in the Pyodide virtual FS. Generates log.html / report.html /
 * output.xml just like the CLI.
 *
 * Runtime resolution is identical to `pyodide.worker.ts`: everything loads
 * from paths resolved against `self.location.href`, so the worker works
 * inside SCORM iframes where the package is mounted at arbitrary URL
 * prefixes.
 *
 * MVP scope per ADR 0024 — supports:
 *  - Single-file `.robot` suites with BuiltIn library (always installed)
 *  - stdout/stderr capture
 *  - `log.html`, `report.html`, `output.xml` readback as strings
 *
 * Not yet supported (next slice):
 *  - On-demand additional libraries (Collections, String, DateTime…)
 *  - `robot.api.get_model()` autocomplete helper
 *  - Multi-suite / resource-file imports
 */

import * as Comlink from 'comlink';

declare const self: DedicatedWorkerGlobalScope;

interface PyodideLike {
  runPython(code: string): unknown;
  runPythonAsync(code: string): Promise<unknown>;
  loadPackage(pkg: string): Promise<void>;
  FS: {
    mkdir(path: string): void;
    writeFile(path: string, data: string | Uint8Array): void;
    readFile(path: string, opts?: { encoding: string }): string | Uint8Array;
    readdir(path: string): string[];
    stat(path: string): { size: number };
  };
}

export interface RobotRunResult {
  readonly returnCode: number;
  readonly passed: boolean;
  readonly consoleOutput: string;
  readonly stats: {
    readonly testsRun: number;
    readonly testsPassed: number;
    readonly testsFailed: number;
    readonly testsSkipped: number;
  };
  readonly artifacts: {
    readonly logHtml: string | null;
    readonly reportHtml: string | null;
    readonly outputXml: string | null;
  };
  /** Wall-clock time for the `robot.run()` call itself (not including cold boot). */
  readonly elapsedMs: number;
  /** Error (with Python traceback, if any) thrown before/while running. */
  readonly error?: { readonly type: string; readonly message: string; readonly traceback: string };
}

export interface RobotProgressEvent {
  readonly phase: 'pyodide' | 'wheel' | 'install' | 'ready' | 'running';
  readonly message: string;
  readonly elapsedMs: number;
}

type RobotProgressHandler = (event: RobotProgressEvent) => void;

const DEFAULT_WHEEL_NAME = 'robotframework-7.4.2-py3-none-any.whl';

let pyodidePromise: Promise<PyodideLike> | null = null;
let rfInstalledPromise: Promise<void> | null = null;

function now(): number {
  return performance.now();
}

async function bootPyodide(onProgress: RobotProgressHandler): Promise<PyodideLike> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    const t0 = now();
    onProgress({ phase: 'pyodide', message: 'Loading Pyodide…', elapsedMs: 0 });
    const pyodideModuleUrl = new URL('../pyodide/pyodide.mjs', self.location.href).href;
    const pyodideIndexUrl = new URL('../pyodide/', self.location.href).href;
    const mod = (await import(/* @vite-ignore */ pyodideModuleUrl)) as {
      loadPyodide(opts: { indexURL: string }): Promise<PyodideLike>;
    };
    const py = await mod.loadPyodide({ indexURL: pyodideIndexUrl });
    onProgress({ phase: 'pyodide', message: 'Pyodide ready', elapsedMs: now() - t0 });
    return py;
  })();
  return pyodidePromise;
}

async function ensureRobotFramework(py: PyodideLike, onProgress: RobotProgressHandler): Promise<void> {
  if (rfInstalledPromise) return rfInstalledPromise;
  rfInstalledPromise = (async () => {
    // Fetch the wheel from the same-origin static directory (ADR 0021 / 0024).
    const t0 = now();
    onProgress({ phase: 'wheel', message: 'Fetching robotframework wheel…', elapsedMs: 0 });
    const wheelUrl = new URL(`../pyodide/wheels/${DEFAULT_WHEEL_NAME}`, self.location.href).href;
    const response = await fetch(wheelUrl, { credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${wheelUrl}: ${response.status} ${response.statusText}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    py.FS.writeFile(`/${DEFAULT_WHEEL_NAME}`, bytes);
    onProgress({
      phase: 'wheel',
      message: `Wheel written to Pyodide FS (${(bytes.length / 1024).toFixed(0)} KB)`,
      elapsedMs: now() - t0,
    });

    // Install micropip, then install RF from the virtual FS (no PyPI fetch).
    const t1 = now();
    onProgress({ phase: 'install', message: 'Installing Robot Framework…', elapsedMs: 0 });
    await py.loadPackage('micropip');
    await py.runPythonAsync(`
import micropip
await micropip.install('emfs:/${DEFAULT_WHEEL_NAME}', deps=False)
import robot  # eager import surfaces install errors here, not on first run
    `);
    onProgress({ phase: 'install', message: 'Robot Framework installed', elapsedMs: now() - t1 });
  })();
  return rfInstalledPromise;
}

const api = {
  async ready(onProgress?: RobotProgressHandler): Promise<void> {
    const cb = onProgress ?? ((_e: RobotProgressEvent): void => undefined);
    const py = await bootPyodide(cb);
    await ensureRobotFramework(py, cb);
    cb({ phase: 'ready', message: 'Runner ready', elapsedMs: 0 });
  },

  async run(
    files: Record<string, string>,
    onProgress?: RobotProgressHandler,
  ): Promise<RobotRunResult> {
    const cb = onProgress ?? ((_e: RobotProgressEvent): void => undefined);
    const py = await bootPyodide(cb);
    await ensureRobotFramework(py, cb);
    cb({ phase: 'running', message: 'Running robot.run()…', elapsedMs: 0 });

    const fileNames = Object.keys(files);
    if (fileNames.length === 0) {
      throw new Error('No .robot files supplied.');
    }

    // Stage inputs into /lernkit_rf_work. Recreate the dir each time so the
    // virtual FS doesn't accumulate cruft between runs.
    py.runPython(`
import os, shutil
workdir = '/lernkit_rf_work'
if os.path.exists(workdir):
    shutil.rmtree(workdir)
os.makedirs(workdir, exist_ok=True)
os.makedirs(workdir + '/results', exist_ok=True)
os.chdir(workdir)
    `);

    for (const [name, content] of Object.entries(files)) {
      const safe = name.replace(/[^a-zA-Z0-9._/-]/g, '_');
      py.FS.writeFile(`/lernkit_rf_work/${safe}`, content);
    }

    const start = now();
    const resultJson = (await py.runPythonAsync(`
import io, json, os, sys

_rf_stdout = io.StringIO()
_rf_stderr = io.StringIO()
_rf_rc = -1
_rf_err = None

try:
    import robot
    robot_files = [f for f in os.listdir('.') if f.endswith('.robot')]
    if not robot_files:
        raise FileNotFoundError('No .robot files found in /lernkit_rf_work')
    _rf_rc = robot.run(
        *robot_files,
        outputdir='results',
        output='output.xml',
        log='log.html',
        report='report.html',
        consolecolors='off',
        loglevel='INFO',
        stdout=_rf_stdout,
        stderr=_rf_stderr,
    )
except Exception as _e:
    _rf_err = {'type': type(_e).__name__, 'message': str(_e), 'traceback': ''}
    try:
        import traceback
        _rf_err['traceback'] = traceback.format_exc()
    except Exception:
        pass

# Parse stats from output.xml (if it exists).
_stats = {'testsRun': 0, 'testsPassed': 0, 'testsFailed': 0, 'testsSkipped': 0}
try:
    import xml.etree.ElementTree as ET
    _tree = ET.parse('results/output.xml')
    _root = _tree.getroot()
    _stat = _root.find('.//statistics/total/stat')
    if _stat is not None:
        p = int(_stat.get('pass', '0'))
        f = int(_stat.get('fail', '0'))
        s = int(_stat.get('skip', '0'))
        _stats = {'testsRun': p + f + s, 'testsPassed': p, 'testsFailed': f, 'testsSkipped': s}
except Exception:
    pass

json.dumps({
    'rc': _rf_rc,
    'stdout': _rf_stdout.getvalue(),
    'stderr': _rf_stderr.getvalue(),
    'stats': _stats,
    'error': _rf_err,
})
    `)) as string;

    const elapsedMs = now() - start;
    const parsed = JSON.parse(resultJson) as {
      rc: number;
      stdout: string;
      stderr: string;
      stats: RobotRunResult['stats'];
      error: RobotRunResult['error'] | null;
    };

    const readIfExists = (path: string): string | null => {
      try {
        return py.FS.readFile(path, { encoding: 'utf8' }) as string;
      } catch {
        return null;
      }
    };

    return {
      returnCode: parsed.rc,
      passed: parsed.rc === 0,
      consoleOutput: parsed.stdout + parsed.stderr,
      stats: parsed.stats,
      artifacts: {
        logHtml: readIfExists('/lernkit_rf_work/results/log.html'),
        reportHtml: readIfExists('/lernkit_rf_work/results/report.html'),
        outputXml: readIfExists('/lernkit_rf_work/results/output.xml'),
      },
      elapsedMs,
      error: parsed.error ?? undefined,
    };
  },
};

export type RobotRunnerApi = typeof api;

Comlink.expose(api);
