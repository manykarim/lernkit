import type { CompletionStatus, Interaction, Score, SuccessStatus, Tracker, TrackerState } from '../tracker.js';

/**
 * Browser-side Tracker adapter for SCORM 1.2.
 *
 * Bridges domain-level Tracker calls (`setScore(0.9)`, `complete()`, etc.) to
 * the SCORM 1.2 runtime bundle produced by `@lernkit/packagers` and bundled
 * into every Lernkit-built SCORM 1.2 zip at `lernkit-runtime/scorm12.js`. That
 * runtime JS discovers the LMS's `window.API`, handles the `HH:MM:SS.SS`
 * session_time format, enforces the 4 KB `cmi.suspend_data` cap, and exposes
 * a small wrapper at `window.LernkitScorm12`.
 *
 * This adapter does not import the runtime JS — it consumes whatever
 * `window.LernkitScorm12` exposes at call time. When the Phase 0+ legal memo
 * clears scorm-again (OQ-P0-12), the runtime JS inside each zip can switch to
 * a vendored scorm-again build without this adapter changing shape.
 *
 * Tracker → SCORM 1.2 wire mapping (research §3.2 + agent brief):
 * - `setProgress(p)` — SCORM 1.2 has no native progress field. We stash
 *   `{ progress: p }` into `cmi.suspend_data` alongside any caller-supplied
 *   JSON via `setBookmark` (which this adapter aliases to suspend_data when
 *   the value is longer than 255 chars).
 * - `setBookmark(s)` — `cmi.core.lesson_location` (255-char cap; truncated).
 * - `setScore(s)` — `cmi.core.score.raw/min/max`; scaled×100 per convention.
 * - `complete()`   — `cmi.core.lesson_status = "completed"`.
 * - `pass()`/`fail()` — `"passed"`/`"failed"`. Callers must order these after
 *   `complete()` because SCORM 1.2 conflates completion + success on a single
 *   field (research §3.2). This adapter preserves call order; it does not try
 *   to be clever.
 * - `recordInteraction(i)` — written but not read back; many LMSes drop
 *   interactions silently (agent brief §4).
 */

interface LernkitScorm12Runtime {
  readonly available: boolean;
  init(): boolean;
  entry(): string;
  status(): string;
  setSuspendData(data: string): boolean;
  setBookmark(b: string): boolean;
  setScore(scaled: number): boolean;
  setStatus(status: string): boolean;
  commit(): boolean;
  terminate(): boolean;
  setExit?(value: string): boolean;
  lastError?(): { code: number; message: string; diagnostic: string } | null;
  setDebug?(flag: boolean): void;
  getApiVersion?(): string;
}

declare global {
  interface Window {
    LernkitScorm12?: LernkitScorm12Runtime;
  }
}

/** Maximum `cmi.suspend_data` size in SCORM 1.2 (research §3.2). */
const SUSPEND_DATA_CAP = 4096;

export class LernkitScorm12Adapter implements Tracker {
  readonly #runtime: LernkitScorm12Runtime;
  #initialized = false;
  #terminated = false;

  #completion: CompletionStatus = 'not-attempted';
  #success: SuccessStatus = 'unknown';
  #progress = 0;
  #score?: Score;
  #bookmark?: string;

  /**
   * @param runtime  Inject a runtime for tests; otherwise the adapter reads `window.LernkitScorm12`.
   *                 If neither is available the adapter throws on `init()`.
   */
  constructor(runtime?: LernkitScorm12Runtime) {
    const resolved = runtime ?? (typeof window === 'undefined' ? undefined : window.LernkitScorm12);
    if (!resolved) {
      throw new Error(
        'LernkitScorm12Adapter requires window.LernkitScorm12 (provided by the SCORM 1.2 runtime bundle) ' +
          'or an explicit runtime injected for testing.',
      );
    }
    this.#runtime = resolved;
  }

  async init(): Promise<boolean> {
    this.#throwIfTerminated();
    if (this.#initialized) return true;
    if (!this.#runtime.available) return false;
    const ok = this.#runtime.init();
    if (!ok) return false;
    this.#initialized = true;
    this.#completion = mapCompletion(this.#runtime.status());
    this.#success = mapSuccess(this.#runtime.status());
    return true;
  }

  async setProgress(progress: number): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    const clamped = clamp01(progress);
    this.#progress = clamped;
    // SCORM 1.2 has no progress field; stash in suspend_data.
    const payload = JSON.stringify({ progress: Number(clamped.toFixed(4)) });
    if (payload.length > SUSPEND_DATA_CAP) {
      throw new Error(`Serialised progress state exceeds SCORM 1.2 suspend_data cap (${SUSPEND_DATA_CAP}).`);
    }
    this.#runtime.setSuspendData(payload);
  }

  async setBookmark(bookmark: string): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    this.#bookmark = bookmark;
    if (bookmark.length <= 255) {
      this.#runtime.setBookmark(bookmark);
    } else {
      // Bookmark exceeds lesson_location cap; stash in suspend_data instead.
      const payload = JSON.stringify({ bookmark });
      if (payload.length > SUSPEND_DATA_CAP) {
        throw new Error(`Serialised bookmark exceeds SCORM 1.2 suspend_data cap (${SUSPEND_DATA_CAP}).`);
      }
      this.#runtime.setSuspendData(payload);
    }
  }

  async recordInteraction(_interaction: Interaction): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    // Phase 1 stores interactions in-memory; wire to cmi.interactions.N in Phase 1+ when
    // we have a real LMS round-trip to verify LMSes actually persist them.
  }

  async setScore(score: Score): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    if (score.scaled < 0 || score.scaled > 1) {
      throw new RangeError(`Score.scaled must be in [0, 1]; got ${score.scaled}`);
    }
    this.#score = score;
    this.#runtime.setScore(score.scaled);
  }

  async complete(): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    this.#completion = 'completed';
    this.#runtime.setStatus('completed');
  }

  async pass(): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    this.#success = 'passed';
    this.#runtime.setStatus('passed');
  }

  async fail(): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    this.#success = 'failed';
    this.#runtime.setStatus('failed');
  }

  async terminate(): Promise<void> {
    if (this.#terminated) return;
    if (this.#initialized) {
      this.#runtime.commit();
      this.#runtime.terminate();
    }
    this.#terminated = true;
  }

  get state(): TrackerState {
    return {
      completion: this.#completion,
      success: this.#success,
      progress: this.#progress,
      score: this.#score,
      bookmark: this.#bookmark,
    };
  }

  #throwIfTerminated(): void {
    if (this.#terminated) {
      throw new Error('LernkitScorm12Adapter has been terminated; no further calls are permitted.');
    }
  }

  #requireInit(): void {
    if (!this.#initialized) {
      throw new Error('LernkitScorm12Adapter.init() must be called before other methods.');
    }
  }
}

function mapCompletion(status: string): CompletionStatus {
  switch (status) {
    case 'completed':
    case 'passed':
    case 'failed':
      return 'completed';
    case 'incomplete':
    case 'browsed':
      return 'incomplete';
    default:
      return 'not-attempted';
  }
}

function mapSuccess(status: string): SuccessStatus {
  if (status === 'passed') return 'passed';
  if (status === 'failed') return 'failed';
  return 'unknown';
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
