import * as Comlink from 'comlink';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RobotProgressEvent, RobotRunResult, RobotRunnerApi } from './rf.worker.js';

export type RobotRunnerStatus = 'idle' | 'loading' | 'ready' | 'running';

export interface UseRobotRunnerResult {
  readonly status: RobotRunnerStatus;
  readonly progress: RobotProgressEvent | null;
  readonly run: (files: Record<string, string>) => Promise<RobotRunResult>;
  readonly terminate: () => void;
}

/**
 * Lazy Robot Framework runner hook. First `run()` call boots Pyodide, fetches
 * the self-hosted wheel, and installs Robot Framework. All subsequent runs
 * reuse the warm worker.
 *
 * The worker lives for the component's lifetime; unmounting terminates it,
 * reclaiming ~60–100 MB of Pyodide heap.
 */
export function useRobotRunner(): UseRobotRunnerResult {
  const workerRef = useRef<Worker | null>(null);
  const apiRef = useRef<Comlink.Remote<RobotRunnerApi> | null>(null);
  const [status, setStatus] = useState<RobotRunnerStatus>('idle');
  const [progress, setProgress] = useState<RobotProgressEvent | null>(null);

  const ensure = useCallback(async (): Promise<Comlink.Remote<RobotRunnerApi>> => {
    if (apiRef.current) return apiRef.current;
    setStatus('loading');
    setProgress(null);
    const worker = new Worker(new URL('./rf.worker.ts', import.meta.url), {
      type: 'module',
      name: 'lernkit-rf',
    });
    workerRef.current = worker;
    const api = Comlink.wrap<RobotRunnerApi>(worker);
    const progressProxy = Comlink.proxy((event: RobotProgressEvent) => setProgress(event));
    await api.ready(progressProxy);
    apiRef.current = api;
    setStatus('ready');
    return api;
  }, []);

  const run = useCallback(
    async (files: Record<string, string>): Promise<RobotRunResult> => {
      const api = await ensure();
      setStatus('running');
      try {
        const progressProxy = Comlink.proxy((event: RobotProgressEvent) => setProgress(event));
        return await api.run(files, progressProxy);
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
    setProgress(null);
  }, []);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      apiRef.current = null;
    },
    [],
  );

  return { status, progress, run, terminate };
}
