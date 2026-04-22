/**
 * Unified tracking interface for SCORM 1.2 / SCORM 2004 / cmi5 / xAPI.
 *
 * Per ADR 0004, components call domain-level methods (`setScore(0.9)`) and the
 * active adapter translates those into the wire format of the target standard.
 *
 * Phase 0 ships the interface and a `NoopAdapter`. Phase 1 adds ScormAgainAdapter12;
 * Phase 3 adds Cmi5Adapter, XapiAdapter, and ScormAgainAdapter2004.
 *
 * Related DDD context: docs/ddd/03-context-models/tracking.md
 */

export type CompletionStatus = 'not-attempted' | 'incomplete' | 'completed';
export type SuccessStatus = 'unknown' | 'passed' | 'failed';

export interface Score {
  /** Scaled score in the range [0, 1], inclusive. Maps to cmi.core.score.scaled and cmi5/xAPI Score.scaled. */
  readonly scaled: number;
  /** Optional raw score; the adapter scales/clamps to standard-specific ranges. */
  readonly raw?: number;
  readonly min?: number;
  readonly max?: number;
}

export type InteractionType =
  | 'true-false'
  | 'choice'
  | 'fill-in'
  | 'long-fill-in'
  | 'matching'
  | 'performance'
  | 'sequencing'
  | 'likert'
  | 'numeric'
  | 'other';

export interface InteractionResult {
  readonly id: string;
  readonly type: InteractionType;
  readonly learnerResponse: string;
  readonly correctResponse?: string;
  readonly correct: boolean;
  readonly latencyMs?: number;
  readonly timestamp: string;
}

export type Interaction = InteractionResult;

export interface TrackerState {
  readonly completion: CompletionStatus;
  readonly success: SuccessStatus;
  readonly progress: number;
  readonly score?: Score;
  readonly bookmark?: string;
}

/**
 * The core Tracker contract. Implementations must be idempotent on terminate()
 * and safe to call from any lifecycle event (unload, visibility change).
 */
export interface Tracker {
  /** Establish an LMS connection (or a no-op for unlaunched contexts). Returns true on success. */
  init(): Promise<boolean>;

  /** Progress is a scaled value in [0, 1]. */
  setProgress(progress: number): Promise<void>;

  /** Opaque resume location. SCORM 1.2 caps this at ~4 KB; the adapter enforces that cap. */
  setBookmark(bookmark: string): Promise<void>;

  recordInteraction(interaction: Interaction): Promise<void>;

  setScore(score: Score): Promise<void>;

  /** Mark the lesson complete — translated per standard (lesson_status, completion_status, etc.). */
  complete(): Promise<void>;

  /** Terminal-pass. `complete()` is still required separately unless the adapter fuses them. */
  pass(): Promise<void>;

  /** Terminal-fail. */
  fail(): Promise<void>;

  /** Flush buffered state and close the LMS API connection. Idempotent. */
  terminate(): Promise<void>;

  /** Read-only snapshot of the tracker's current understanding of lesson state. */
  readonly state: TrackerState;
}
