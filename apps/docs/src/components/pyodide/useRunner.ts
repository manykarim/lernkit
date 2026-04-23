import * as Comlink from 'comlink';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PyRunnerApi, RunResult } from './pyodide.worker.js';

export type RunnerStatus = 'idle' | 'loading' | 'ready' | 'running';

export interface UseRunnerResult {
  readonly status: RunnerStatus;
  readonly run: (code: string) => Promise<RunResult>;
  readonly terminate: () => void;
}

/**
 * Lazy Pyodide runner hook. The worker is NOT created on mount — it spins up
 * on the first `run()` call. This preserves LCP on lessons that never invoke
 * the runner (prose-only pages, or a mounted cell the learner never clicks).
 *
 * Single worker per hook instance. Tear down by calling `terminate()` (for
 * manual "Reset kernel"-style actions) or unmounting the component — the
 * effect cleanup reclaims the worker heap.
 */
export function useRunner(): UseRunnerResult {
  const workerRef = useRef<Worker | null>(null);
  const apiRef = useRef<Comlink.Remote<PyRunnerApi> | null>(null);
  const [status, setStatus] = useState<RunnerStatus>('idle');

  const ensure = useCallback(async (): Promise<Comlink.Remote<PyRunnerApi>> => {
    if (apiRef.current) return apiRef.current;
    setStatus('loading');
    const worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url), {
      type: 'module',
      name: 'lernkit-pyodide',
    });
    workerRef.current = worker;
    const api = Comlink.wrap<PyRunnerApi>(worker);
    await api.ready();
    apiRef.current = api;
    setStatus('ready');
    return api;
  }, []);

  const run = useCallback(
    async (code: string): Promise<RunResult> => {
      const api = await ensure();
      setStatus('running');
      try {
        return await api.run(code);
      } finally {
        setStatus('ready');
      }
    },
    [ensure],
  );

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    apiRef.current = null;
    setStatus('idle');
  }, []);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      apiRef.current = null;
    },
    [],
  );

  return { status, run, terminate };
}
