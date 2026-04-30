---
id: interface
title: The Tracker interface
sidebar_position: 1
---

# The Tracker interface

`Tracker` is the contract every interactive Lernkit widget speaks. The same
quiz, runnable cell, or completion gate emits SCORM `cmi.*` calls,
xAPI statements, or nothing — depending on which adapter the runtime picks.

```ts
import type { Tracker } from '@lernkit/tracker';
```

## Shape

```ts
interface Tracker {
  /** Begin a session. Resolves true on success, false if no LMS is reachable. */
  init(): Promise<boolean>;

  /** Report progress in [0, 1]. */
  setProgress(progress: number): Promise<void>;

  /** Set a resume-from-here marker. */
  setBookmark(bookmark: string): Promise<void>;

  /** Record an interaction (MCQ answer, fill-in, drag-drop). */
  recordInteraction(i: Interaction): Promise<void>;

  /** Set the score for the current activity. */
  setScore(score: Score): Promise<void>;

  /** Mark the activity completed. Independent from pass/fail. */
  complete(): Promise<void>;

  /** Mark passed. Order matters: usually call after complete(). */
  pass(): Promise<void>;

  /** Mark failed. Order matters: usually call after complete(). */
  fail(): Promise<void>;

  /** End the session. Idempotent. */
  terminate(): Promise<void>;

  /** Snapshot of state for UI rendering. */
  readonly state: TrackerState;
}
```

## Type details

### `Interaction`

```ts
interface Interaction {
  readonly id: string;            // unique within the activity
  readonly type: InteractionType; // 'choice' | 'fill-in' | 'true-false' | …
  readonly learnerResponse: string;
  readonly correctResponse?: string;
  readonly correct: boolean;
  readonly timestamp: string;     // ISO 8601
}
```

### `Score`

```ts
interface Score {
  readonly scaled: number;  // [0, 1]; required
  readonly raw?: number;    // raw score
  readonly min?: number;    // raw min (default 0)
  readonly max?: number;    // raw max (default 100)
}
```

### `TrackerState`

```ts
interface TrackerState {
  readonly completion: 'not-attempted' | 'incomplete' | 'completed';
  readonly success: 'unknown' | 'passed' | 'failed';
  readonly progress: number;
  readonly score?: Score;
  readonly bookmark?: string;
}
```

## Lifecycle

```
new Adapter() → init() → setProgress / setBookmark / recordInteraction / setScore *
                                                                          ↓
                                                     complete() → pass() | fail()
                                                                          ↓
                                                                   terminate()
```

Adapters are required to be **idempotent**:

- `init()` can be called multiple times; subsequent calls return `true` if
  the session is already initialised.
- `terminate()` can be called multiple times; subsequent calls are no-ops.
- All other methods throw `Error` if called *after* `terminate()` or *before*
  `init()`.

## Authoring with a Tracker

A typical quiz component:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { Tracker } from '@lernkit/tracker';

export function MyQuiz({ tracker }: { tracker: Tracker }) {
  const [graded, setGraded] = useState(false);

  useEffect(() => { void tracker.init(); }, [tracker]);

  async function handleSubmit(answer: string) {
    const correct = answer === 'B';
    await tracker.recordInteraction({
      id: 'q1',
      type: 'choice',
      learnerResponse: answer,
      correctResponse: 'B',
      correct,
      timestamp: new Date().toISOString(),
    });
    await tracker.setScore({ scaled: correct ? 1 : 0 });
    await tracker.complete();
    correct ? await tracker.pass() : await tracker.fail();
    setGraded(true);
  }
  // ... render UI
}
```

The component never knows which adapter is wired up. The runtime decides; see
[pickTracker](/tracking/pick-tracker).

## Where to go next

- **[Adapters](/tracking/adapters)** — the three concrete implementations.
- **[pickTracker](/tracking/pick-tracker)** — runtime adapter selection.
- **[API reference](/api/tracker)** — generated from TSDoc.
