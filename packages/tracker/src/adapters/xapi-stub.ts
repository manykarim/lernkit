import type { CompletionStatus, Interaction, Score, SuccessStatus, Tracker, TrackerState } from '../tracker.js';

/**
 * In-memory xAPI 2.0 Tracker adapter. Emits well-formed statements into a
 * queue that callers can read via `statements`. Ships zero network I/O — it
 * is the adapter we wire to the Tracker in:
 *
 * - Astro preview (`pnpm dev`) — inspect emitted statements during authoring
 * - Unit tests — assert emitted statement shapes
 * - Phase 3 xAPI proxy (planned) — the statement builders here become the
 *   basis of the real `XapiAdapter` that POSTs to an LRS via the FastAPI
 *   `/xapi` proxy (per ADR 0013).
 *
 * Statement shape follows xAPI 2.0 / IEEE 9274.1.1:
 *   `{ id, actor, verb, object, result?, context?, timestamp, stored?, authority? }`
 *
 * The stub sets `id` to a v4-like UUID, `actor` to an anonymous account, and
 * `timestamp` to the ISO-8601 wall-clock moment of emission. Override via
 * `XapiStubOptions` for test determinism.
 */

export type XapiVerb = 'initialized' | 'answered' | 'completed' | 'passed' | 'failed' | 'progressed' | 'terminated';

const VERB_IRI: Record<XapiVerb, string> = {
  initialized: 'http://adlnet.gov/expapi/verbs/initialized',
  answered: 'http://adlnet.gov/expapi/verbs/answered',
  completed: 'http://adlnet.gov/expapi/verbs/completed',
  passed: 'http://adlnet.gov/expapi/verbs/passed',
  failed: 'http://adlnet.gov/expapi/verbs/failed',
  progressed: 'http://adlnet.gov/expapi/verbs/progressed',
  terminated: 'http://adlnet.gov/expapi/verbs/terminated',
};

const VERB_DISPLAY: Record<XapiVerb, string> = {
  initialized: 'initialized',
  answered: 'answered',
  completed: 'completed',
  passed: 'passed',
  failed: 'failed',
  progressed: 'progressed',
  terminated: 'terminated',
};

export interface XapiStatementActor {
  readonly account: {
    readonly name: string;
    readonly homePage: string;
  };
  readonly objectType?: 'Agent';
}

export interface XapiStatementObject {
  readonly id: string;
  readonly objectType: 'Activity';
  readonly definition?: {
    readonly name?: Record<string, string>;
    readonly description?: Record<string, string>;
    readonly type?: string;
    readonly interactionType?: string;
    readonly correctResponsesPattern?: readonly string[];
  };
}

export interface XapiStatement {
  readonly id: string;
  readonly actor: XapiStatementActor;
  readonly verb: { readonly id: string; readonly display: Record<string, string> };
  readonly object: XapiStatementObject;
  readonly result?: {
    readonly success?: boolean;
    readonly completion?: boolean;
    readonly response?: string;
    readonly score?: {
      readonly scaled?: number;
      readonly raw?: number;
      readonly min?: number;
      readonly max?: number;
    };
    readonly extensions?: Record<string, unknown>;
  };
  readonly timestamp: string;
}

export interface XapiStubOptions {
  /** Base IRI prepended to activity IDs. Default: `https://lernkit.dev/activity`. */
  readonly activityBase?: string;
  /** Actor homePage (xAPI account.homePage). Default: `https://lernkit.dev/actors`. */
  readonly actorHomePage?: string;
  /** Actor account name. Default: `anonymous`. */
  readonly actorName?: string;
  /** Override the ID generator for deterministic tests. */
  readonly idGenerator?: () => string;
  /** Override the timestamp generator for deterministic tests. */
  readonly timestampGenerator?: () => string;
  /**
   * Optional listener invoked synchronously after every enqueued statement.
   * Useful for a preview-mode UI that renders statements as they land.
   */
  readonly onStatement?: (s: XapiStatement) => void;
}

const DEFAULT_ACTIVITY_BASE = 'https://lernkit.dev/activity';
const DEFAULT_ACTOR_HOMEPAGE = 'https://lernkit.dev/actors';
const DEFAULT_ACTOR_NAME = 'anonymous';

/** RFC 4122 v4-like UUID without external deps. Not cryptographically strong — fine for stubs. */
function defaultUuid(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // Set version (4) and variant (10xx) bits per RFC 4122 §4.4.
  const byte6 = bytes[6] ?? 0;
  const byte8 = bytes[8] ?? 0;
  bytes[6] = (byte6 & 0x0f) | 0x40;
  bytes[8] = (byte8 & 0x3f) | 0x80;
  const hex = Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class XapiStubAdapter implements Tracker {
  #initialized = false;
  #terminated = false;
  readonly #statements: XapiStatement[] = [];

  #completion: CompletionStatus = 'not-attempted';
  #success: SuccessStatus = 'unknown';
  #progress = 0;
  #score?: Score;
  #bookmark?: string;

  readonly #opts: Required<Pick<XapiStubOptions, 'activityBase' | 'actorHomePage' | 'actorName'>> & XapiStubOptions;

  constructor(
    /** Stable ID for the containing activity. Becomes the xAPI `object.id` for session-level statements. */
    readonly activityId: string,
    options: XapiStubOptions = {},
  ) {
    this.#opts = {
      activityBase: options.activityBase ?? DEFAULT_ACTIVITY_BASE,
      actorHomePage: options.actorHomePage ?? DEFAULT_ACTOR_HOMEPAGE,
      actorName: options.actorName ?? DEFAULT_ACTOR_NAME,
      idGenerator: options.idGenerator,
      timestampGenerator: options.timestampGenerator,
      onStatement: options.onStatement,
    };
  }

  async init(): Promise<boolean> {
    if (this.#initialized) return true;
    this.#initialized = true;
    if (this.#completion === 'not-attempted') this.#completion = 'incomplete';
    this.#enqueue(this.#buildStatement('initialized', this.#activityIri(this.activityId)));
    return true;
  }

  async setProgress(progress: number): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    const clamped = clamp01(progress);
    this.#progress = clamped;
    this.#enqueue(
      this.#buildStatement('progressed', this.#activityIri(this.activityId), {
        extensions: { 'https://lernkit.dev/xapi/extension/progress': Number(clamped.toFixed(4)) },
      }),
    );
  }

  async setBookmark(bookmark: string): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    this.#bookmark = bookmark;
  }

  async recordInteraction(interaction: Interaction): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    const obj: XapiStatementObject = {
      id: this.#activityIri(`${this.activityId}/interaction/${interaction.id}`),
      objectType: 'Activity',
      definition: {
        type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
        interactionType: interaction.type,
        correctResponsesPattern: interaction.correctResponse ? [interaction.correctResponse] : undefined,
      },
    };
    this.#enqueue(
      this.#buildStatementRaw('answered', obj, {
        response: interaction.learnerResponse,
        success: interaction.correct,
      }),
    );
  }

  async setScore(score: Score): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    if (score.scaled < 0 || score.scaled > 1) {
      throw new RangeError(`Score.scaled must be in [0, 1]; got ${score.scaled}`);
    }
    this.#score = score;
    // xAPI convention: score lands on the completed / passed / failed statement.
    // We DO NOT emit a separate "scored" statement here; the result shape covers it.
  }

  async complete(): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    this.#completion = 'completed';
    this.#enqueue(
      this.#buildStatement('completed', this.#activityIri(this.activityId), {
        completion: true,
        score: this.#score ? this.#normaliseScore(this.#score) : undefined,
      }),
    );
  }

  async pass(): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    this.#success = 'passed';
    this.#enqueue(
      this.#buildStatement('passed', this.#activityIri(this.activityId), {
        success: true,
        completion: this.#completion === 'completed' ? true : undefined,
        score: this.#score ? this.#normaliseScore(this.#score) : undefined,
      }),
    );
  }

  async fail(): Promise<void> {
    this.#throwIfTerminated();
    this.#requireInit();
    this.#success = 'failed';
    this.#enqueue(
      this.#buildStatement('failed', this.#activityIri(this.activityId), {
        success: false,
        score: this.#score ? this.#normaliseScore(this.#score) : undefined,
      }),
    );
  }

  async terminate(): Promise<void> {
    if (this.#terminated) return;
    if (this.#initialized) {
      this.#enqueue(this.#buildStatement('terminated', this.#activityIri(this.activityId)));
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

  /** Immutable snapshot of all statements emitted so far. */
  get statements(): readonly XapiStatement[] {
    return [...this.#statements];
  }

  /** Clear the queue. Useful between test cases. */
  clearStatements(): void {
    this.#statements.length = 0;
  }

  #buildStatement(verb: XapiVerb, objectIri: string, result?: XapiStatement['result']): XapiStatement {
    return this.#buildStatementRaw(verb, { id: objectIri, objectType: 'Activity' }, result);
  }

  #buildStatementRaw(verb: XapiVerb, object: XapiStatementObject, result?: XapiStatement['result']): XapiStatement {
    const statement: XapiStatement = {
      id: (this.#opts.idGenerator ?? defaultUuid)(),
      actor: {
        account: { name: this.#opts.actorName, homePage: this.#opts.actorHomePage },
        objectType: 'Agent',
      },
      verb: {
        id: VERB_IRI[verb],
        display: { 'en-US': VERB_DISPLAY[verb] },
      },
      object,
      result,
      timestamp: (this.#opts.timestampGenerator ?? (() => new Date().toISOString()))(),
    };
    return statement;
  }

  #activityIri(suffix: string): string {
    const base = this.#opts.activityBase.endsWith('/') ? this.#opts.activityBase.slice(0, -1) : this.#opts.activityBase;
    const tail = suffix.startsWith('/') ? suffix.slice(1) : suffix;
    return `${base}/${tail}`;
  }

  #enqueue(s: XapiStatement): void {
    this.#statements.push(s);
    this.#opts.onStatement?.(s);
  }

  #normaliseScore(score: Score): NonNullable<XapiStatement['result']>['score'] {
    return {
      scaled: Number(score.scaled.toFixed(4)),
      raw: score.raw,
      min: score.min,
      max: score.max,
    };
  }

  #throwIfTerminated(): void {
    if (this.#terminated) {
      throw new Error('XapiStubAdapter has been terminated; no further calls are permitted.');
    }
  }

  #requireInit(): void {
    if (!this.#initialized) {
      throw new Error('XapiStubAdapter.init() must be called before other methods.');
    }
  }
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
