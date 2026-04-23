import { useCallback, useState, type ReactElement } from 'react';
import { useRunner } from './useRunner.js';

export interface RunnablePythonProps {
  /** Initial source. The learner may edit it before running. */
  readonly initialCode: string;
  /** Optional caption shown above the editor. */
  readonly caption?: string;
  /**
   * Button label for the primary action. Default: "Run".
   * Handy to override on long-running cells (e.g. "Fit model").
   */
  readonly runLabel?: string;
}

/**
 * In-browser Python cell, backed by Pyodide in a Web Worker.
 *
 * - First click on Run triggers the worker boot + Pyodide init (~2–5 s warm cache).
 * - Subsequent runs are fast (~50–200 ms for small snippets).
 * - stdout / stderr are captured and rendered as separate panels.
 * - Python exceptions show their type + message (and traceback if present).
 *
 * Phase-2 MVP scope — Phase 3 adds: persistent cellGroups, package loading
 * from a mirror, matplotlib canvas backend, `input()` support on COOP/COEP
 * pages, interrupt buttons (`pyodide.setInterruptBuffer`).
 */
export function RunnablePython({ initialCode, caption, runLabel = 'Run' }: RunnablePythonProps): ReactElement {
  const { status, run } = useRunner();
  const [code, setCode] = useState(initialCode);
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const onRun = useCallback(async () => {
    setError(null);
    setStdout('');
    setStderr('');
    setElapsedMs(null);
    const result = await run(code);
    setStdout(result.stdout);
    setStderr(result.stderr);
    setElapsedMs(result.elapsedMs);
    if (result.error) {
      setError(`${result.error.type}: ${result.error.message}`);
    }
  }, [code, run]);

  const onReset = useCallback(() => {
    setCode(initialCode);
    setError(null);
    setStdout('');
    setStderr('');
    setElapsedMs(null);
  }, [initialCode]);

  const busy = status === 'loading' || status === 'running';

  return (
    <div className="lernkit-runnable-python" data-status={status}>
      {caption ? <p className="lernkit-runnable-python__caption">{caption}</p> : null}

      <label className="lernkit-runnable-python__editor-label" htmlFor="lernkit-py-editor">
        Python source
      </label>
      <textarea
        id="lernkit-py-editor"
        className="lernkit-runnable-python__editor"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={Math.min(14, Math.max(4, code.split('\n').length))}
        aria-label="Python source — edit then click Run"
      />

      <div className="lernkit-runnable-python__toolbar">
        <button
          type="button"
          className="lernkit-runnable-python__run"
          onClick={() => {
            void onRun();
          }}
          disabled={busy}
          data-testid="runnable-python-run"
        >
          {status === 'loading' ? 'Loading Pyodide…' : status === 'running' ? 'Running…' : `▶ ${runLabel}`}
        </button>
        <button
          type="button"
          className="lernkit-runnable-python__reset"
          onClick={onReset}
          disabled={busy}
        >
          Reset
        </button>
        {elapsedMs !== null ? (
          <span className="lernkit-runnable-python__timing" aria-live="polite">
            {Math.round(elapsedMs)} ms
          </span>
        ) : null}
      </div>

      {stdout ? (
        <pre className="lernkit-runnable-python__stdout" aria-label="stdout">
          {stdout}
        </pre>
      ) : null}

      {stderr ? (
        <pre className="lernkit-runnable-python__stderr" aria-label="stderr" data-role="stderr">
          {stderr}
        </pre>
      ) : null}

      {error ? (
        <div role="alert" className="lernkit-runnable-python__error">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export default RunnablePython;
