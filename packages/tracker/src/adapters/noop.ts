import type { CompletionStatus, Interaction, Score, SuccessStatus, Tracker, TrackerState } from '../tracker.js';

/**
 * No-op tracker adapter. Used for previews (`astro dev`, `?print=1`, test runs)
 * where no LMS is present. Records state internally so components that read
 * `tracker.state` get consistent values, but never talks to any external API.
 *
 * Phase 0: only adapter shipped. Phase 1 introduces `ScormAgainAdapter12`.
 */
export class NoopAdapter implements Tracker {
  #completion: CompletionStatus = 'not-attempted';
  #success: SuccessStatus = 'unknown';
  #progress = 0;
  #score?: Score;
  #bookmark?: string;
  readonly #interactions: Interaction[] = [];
  #terminated = false;

  async init(): Promise<boolean> {
    if (this.#completion === 'not-attempted') this.#completion = 'incomplete';
    return true;
  }

  async setProgress(progress: number): Promise<void> {
    this.#throwIfTerminated();
    this.#progress = clamp01(progress);
  }

  async setBookmark(bookmark: string): Promise<void> {
    this.#throwIfTerminated();
    this.#bookmark = bookmark;
  }

  async recordInteraction(interaction: Interaction): Promise<void> {
    this.#throwIfTerminated();
    this.#interactions.push(interaction);
  }

  async setScore(score: Score): Promise<void> {
    this.#throwIfTerminated();
    if (score.scaled < 0 || score.scaled > 1) {
      throw new RangeError(`Score.scaled must be in [0, 1]; got ${score.scaled}`);
    }
    this.#score = score;
  }

  async complete(): Promise<void> {
    this.#throwIfTerminated();
    this.#completion = 'completed';
  }

  async pass(): Promise<void> {
    this.#throwIfTerminated();
    this.#success = 'passed';
  }

  async fail(): Promise<void> {
    this.#throwIfTerminated();
    this.#success = 'failed';
  }

  async terminate(): Promise<void> {
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

  /** Test-only accessor. Not part of the Tracker contract. */
  get interactions(): readonly Interaction[] {
    return this.#interactions;
  }

  #throwIfTerminated(): void {
    if (this.#terminated) {
      throw new Error('Tracker has been terminated; no further calls are permitted.');
    }
  }
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
