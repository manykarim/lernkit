# @lernkit/tracker

Unified tracking interface for SCORM 1.2 / SCORM 2004 / cmi5 / xAPI with pluggable adapters.

Components call domain-level methods — `setScore(0.9)`, `setProgress(0.75)`, `recordInteraction(...)` — and the active adapter translates those into the wire format of the target standard. See [ADR 0004](../../docs/adr/0004-unified-tracker-interface-with-pluggable-adapters.md).

## Phase 0 status

This package ships the `Tracker` interface plus a `NoopAdapter` used for previews (Astro dev server, `?print=1`, test runs). The real adapters land in later phases:

| Adapter | Phase | Standard |
|---|---|---|
| `NoopAdapter` | Phase 0 | no-op (dev preview) |
| `ScormAgainAdapter12` | Phase 1 | SCORM 1.2 |
| `ScormAgainAdapter2004` | Phase 3 | SCORM 2004 4th Ed |
| `Cmi5Adapter` | Phase 3 | cmi5 |
| `XapiAdapter` | Phase 3 | xAPI 2.0 / IEEE 9274.1.1 |

## Usage (preview)

```ts
import { NoopAdapter, type Tracker } from '@lernkit/tracker';

const tracker: Tracker = new NoopAdapter();
await tracker.init();
await tracker.setProgress(0.5);
await tracker.setScore({ scaled: 0.9 });
await tracker.complete();
await tracker.pass();
await tracker.terminate();
```
