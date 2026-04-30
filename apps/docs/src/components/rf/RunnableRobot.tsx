import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react';
import { RobotFrameworkEditor } from './editor/RobotFrameworkEditor.js';
import { useRobotRunner } from './useRobotRunner.js';
import type { RobotRunResult } from './rf.worker.js';

export interface RunnableRobotProps {
  /** Initial `.robot` source. Learner may edit before running. */
  readonly initialCode: string;
  /** File name inside the virtual FS. Defaults to `suite.robot`. */
  readonly fileName?: string;
  /** Optional caption rendered above the editor. */
  readonly caption?: string;
  /** Button label. Default: "Run suite". */
  readonly runLabel?: string;
}

/**
 * Browser-side Robot Framework cell (ADR 0024).
 *
 * Runs a `.robot` suite in Pyodide via the self-hosted `robotframework` wheel,
 * then renders:
 *  - console output (stdout/stderr combined)
 *  - a stats pill (passed / failed / skipped)
 *  - a toggle that renders `log.html` in a same-origin blob iframe
 *
 * Editor: CodeMirror 6 with a StreamLanguage-based RF grammar
 * (see `editor/robot-framework-language.ts`) and BuiltIn keyword
 * autocomplete (Ctrl-Space / Cmd-Space). Per ADR 0010 + ADR 0024.
 */
export function RunnableRobot({
  initialCode,
  fileName = 'suite.robot',
  caption,
  runLabel = 'Run suite',
}: RunnableRobotProps): ReactElement {
  const { status, progress, run } = useRobotRunner();
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<RobotRunResult | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const editorId = useId();
  const previousBlobsRef = useRef<readonly string[]>([]);

  const blobs = useMemo<{ log: string | null; report: string | null; outputXml: string | null }>(
    () => ({
      log: result?.artifacts.logHtml
        ? URL.createObjectURL(new Blob([result.artifacts.logHtml], { type: 'text/html' }))
        : null,
      report: result?.artifacts.reportHtml
        ? URL.createObjectURL(new Blob([result.artifacts.reportHtml], { type: 'text/html' }))
        : null,
      outputXml: result?.artifacts.outputXml
        ? URL.createObjectURL(
            new Blob([result.artifacts.outputXml], { type: 'application/xml' }),
          )
        : null,
    }),
    [result],
  );

  // Revoke previous blob URLs when a fresh result arrives, and on unmount.
  useEffect(() => {
    const next = [blobs.log, blobs.report, blobs.outputXml].filter(
      (u): u is string => u !== null,
    );
    for (const url of previousBlobsRef.current) {
      if (!next.includes(url)) URL.revokeObjectURL(url);
    }
    previousBlobsRef.current = next;
    return () => {
      for (const url of previousBlobsRef.current) URL.revokeObjectURL(url);
      previousBlobsRef.current = [];
    };
  }, [blobs]);

  const onRun = useCallback(async () => {
    setResult(null);
    setShowLog(false);
    setShowReport(false);
    const r = await run({ [fileName]: code });
    setResult(r);
  }, [code, fileName, run]);

  const onReset = useCallback(() => {
    setCode(initialCode);
    setResult(null);
    setShowLog(false);
    setShowReport(false);
  }, [initialCode]);

  const stem = fileName.replace(/\.robot$/, '');

  const busy = status === 'loading' || status === 'running';

  return (
    <div className="lernkit-runnable-robot" data-status={status}>
      {caption ? <p className="lernkit-runnable-robot__caption">{caption}</p> : null}

      <label className="lernkit-runnable-robot__editor-label" htmlFor={editorId}>
        Robot Framework source ({fileName})
      </label>
      <RobotFrameworkEditor
        id={editorId}
        value={code}
        onChange={setCode}
        readOnly={busy}
        ariaLabel={`Robot Framework source for ${fileName} — edit then click Run`}
        testId="runnable-robot-editor"
      />

      <div className="lernkit-runnable-robot__toolbar">
        <button
          type="button"
          className="lernkit-runnable-robot__run"
          onClick={() => {
            void onRun();
          }}
          disabled={busy}
          data-testid="runnable-robot-run"
        >
          {status === 'loading'
            ? progress?.message ?? 'Loading Robot Framework…'
            : status === 'running'
              ? 'Running…'
              : `▶ ${runLabel}`}
        </button>
        <button
          type="button"
          className="lernkit-runnable-robot__reset"
          onClick={onReset}
          disabled={busy}
        >
          Reset
        </button>
        {result ? (
          <span className="lernkit-runnable-robot__timing" aria-live="polite">
            rc={result.returnCode} · {Math.round(result.elapsedMs)} ms
          </span>
        ) : null}
      </div>

      {status === 'loading' && progress ? (
        <p className="lernkit-runnable-robot__progress" role="status">
          {progress.message}
        </p>
      ) : null}

      {result ? (
        <>
          <div
            className="lernkit-runnable-robot__stats"
            data-passed={result.passed}
            role="status"
          >
            <strong>{result.passed ? '✓ All passed' : '✗ Failed'}</strong> ·{' '}
            {result.stats.testsPassed} passed · {result.stats.testsFailed} failed ·{' '}
            {result.stats.testsSkipped} skipped
          </div>

          {result.consoleOutput ? (
            <pre className="lernkit-runnable-robot__console" aria-label="console output">
              {result.consoleOutput}
            </pre>
          ) : null}

          {result.error ? (
            <div role="alert" className="lernkit-runnable-robot__error">
              <strong>{result.error.type}:</strong> {result.error.message}
              {result.error.traceback ? (
                <pre className="lernkit-runnable-robot__traceback">{result.error.traceback}</pre>
              ) : null}
            </div>
          ) : null}

          {blobs.log || blobs.report || blobs.outputXml ? (
            <div className="lernkit-runnable-robot__artifacts">
              {blobs.log ? (
                <>
                  <button
                    type="button"
                    className="lernkit-runnable-robot__toggle-log"
                    onClick={() => setShowLog((v) => !v)}
                  >
                    {showLog ? 'Hide log.html' : 'Show log.html'}
                  </button>
                  <a
                    className="lernkit-runnable-robot__download-log"
                    href={blobs.log}
                    download={`${stem}-log.html`}
                  >
                    Download log.html
                  </a>
                </>
              ) : null}
              {blobs.report ? (
                <>
                  <button
                    type="button"
                    className="lernkit-runnable-robot__toggle-report"
                    onClick={() => setShowReport((v) => !v)}
                  >
                    {showReport ? 'Hide report.html' : 'Show report.html'}
                  </button>
                  <a
                    className="lernkit-runnable-robot__download-report"
                    href={blobs.report}
                    download={`${stem}-report.html`}
                  >
                    Download report.html
                  </a>
                </>
              ) : null}
              {blobs.outputXml ? (
                <a
                  className="lernkit-runnable-robot__download-xml"
                  href={blobs.outputXml}
                  download={`${stem}-output.xml`}
                >
                  Download output.xml
                </a>
              ) : null}
              {/*
               * `allow-scripts` lets RF's inline JS render the report;
               * `allow-same-origin` keeps the iframe at the parent's blob origin
               * so RF's sessionStorage-backed UI state (collapsed-suite memory,
               * keyword expansion, navigation between suites in report.html,
               * etc.) actually works. Browsers throw `SecurityError` on
               * `sessionStorage` access from opaque-origin sandboxed iframes,
               * which RF surfaces as a degraded render. The iframe content is
               * RF-generated (we ship the wheel) — same trust level as the
               * rest of the package.
               */}
              {showLog && blobs.log ? (
                <iframe
                  src={blobs.log}
                  title="Robot Framework log.html"
                  className="lernkit-runnable-robot__log-frame"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : null}
              {showReport && blobs.report ? (
                <iframe
                  src={blobs.report}
                  title="Robot Framework report.html"
                  className="lernkit-runnable-robot__report-frame"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default RunnableRobot;
