---
id: adapters
title: Adapters
sidebar_position: 2
---

# Adapters

Three concrete `Tracker` implementations ship in `@lernkit/tracker`. Each
fulfills the same interface; they differ only in *what they do with* the
calls.

| Adapter | Use case | Side effects |
|---|---|---|
| `NoopAdapter` | Static preview, tests | Nothing — methods resolve, state stays in memory |
| `XapiStubAdapter` | Dev, prototyping | Builds an in-memory queue of xAPI 2.0 statements |
| `LernkitScorm12Adapter` | Packaged SCORM 1.2 SCO | Bridges to the LMS's `window.API` via the runtime |

All three are exported from the package root:

```ts
import {
  NoopAdapter,
  XapiStubAdapter,
  LernkitScorm12Adapter,
} from '@lernkit/tracker';
```

## `NoopAdapter`

```ts
const tracker = new NoopAdapter();
await tracker.init();   // → true
await tracker.complete();
await tracker.terminate();
```

Use when you need a `Tracker` shape but no actual reporting:

- Unit tests for components that take a tracker prop.
- Static preview / live dev when you don't care about emitted events.

`tracker.state` reflects the calls (so UI that conditionalizes on
`state.completion === 'completed'` works), but nothing escapes the instance.

## `XapiStubAdapter`

```ts
const tracker = new XapiStubAdapter('rf-training/section-1/review');
await tracker.init();
await tracker.recordInteraction({ /* ... */ });
await tracker.complete();
console.log(tracker.statements);  // ← inspect the queue
```

Builds [xAPI 2.0](https://github.com/adlnet/xAPI-Spec) statements in memory.
The first constructor argument is the *activity ID*, used as the activity IRI
in every emitted statement.

The dev course renders the statement queue in a `<details>` panel below each
quiz; authors can eyeball the wire format without an LRS.

`tracker.statements` is a read-only snapshot. `tracker.clearStatements()`
empties the queue (useful in tests).

## `LernkitScorm12Adapter`

```ts
// In a component, only available inside a packaged SCORM SCO
if (window.LernkitScorm12?.available) {
  const tracker = new LernkitScorm12Adapter();
  await tracker.init();
  await tracker.setScore({ scaled: 0.85 });
  await tracker.complete();
  await tracker.pass();
  await tracker.terminate();
}
```

Bridges Tracker calls to the SCORM 1.2 `window.API`. The adapter doesn't
import the runtime; it consumes whatever `window.LernkitScorm12` exposes at
call time. The runtime itself is injected into each lesson HTML by the
packager.

### Tracker → SCORM 1.2 wire mapping

| Tracker call | SCORM 1.2 effect |
|---|---|
| `setProgress(p)` | Stashes `{ progress: p }` into `cmi.suspend_data` (no native progress field in 1.2) |
| `setBookmark(s)` | `cmi.core.lesson_location` (255-char cap; truncated) |
| `setScore(s)` | `cmi.core.score.raw/min/max`; `s.scaled × 100` per convention |
| `complete()` | `cmi.core.lesson_status = 'completed'` |
| `pass()` | `cmi.core.lesson_status = 'passed'` |
| `fail()` | `cmi.core.lesson_status = 'failed'` |
| `recordInteraction(i)` | Buffered in-adapter; not yet written to `cmi.interactions.N` (Phase 1+) |

### Constructor injection (for tests)

```ts
const fakeRuntime = { /* implements LernkitScorm12Runtime */ };
const tracker = new LernkitScorm12Adapter(fakeRuntime);
```

Skip `window.LernkitScorm12` lookup; useful for unit tests.

## Choosing at runtime

You usually shouldn't pick the adapter manually. The
[`pickTracker(activityId)`](/tracking/pick-tracker) helper does it for you
based on whether you're inside a packaged SCO.

## Where to go next

- **[`pickTracker`](/tracking/pick-tracker)** — automatic adapter selection.
- **[API reference](/api/tracker)** — generated from TSDoc.
