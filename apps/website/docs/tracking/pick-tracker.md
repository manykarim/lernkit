---
id: pick-tracker
title: pickTracker — runtime selection
sidebar_position: 3
---

# `pickTracker` — runtime adapter selection

`pickTracker(activityId)` is a small helper that picks the right `Tracker`
based on what's available in the current environment:

- Inside a packaged SCORM 1.2 SCO (`window.LernkitScorm12.available === true`)
  → `LernkitScorm12Adapter`.
- Anywhere else → `XapiStubAdapter`.

The helper lives in the docs app at
[`apps/docs/src/lib/pick-tracker.ts`](https://github.com/manykarim/lernkit/blob/main/apps/docs/src/lib/pick-tracker.ts);
copy it into your own app or extract to a shared package as your needs grow.

## Source

```ts
import { LernkitScorm12Adapter, XapiStubAdapter, type Tracker } from '@lernkit/tracker';

export type PickedTracker =
  | { readonly kind: 'scorm12'; readonly tracker: LernkitScorm12Adapter }
  | { readonly kind: 'xapi-stub'; readonly tracker: XapiStubAdapter };

export function pickTracker(activityId: string): PickedTracker {
  if (typeof window !== 'undefined' && window.LernkitScorm12?.available) {
    return { kind: 'scorm12', tracker: new LernkitScorm12Adapter() };
  }
  return { kind: 'xapi-stub', tracker: new XapiStubAdapter(activityId) };
}

export type { Tracker };
```

## Usage

```tsx
import { pickTracker } from '../lib/pick-tracker';

export default function MyQuiz() {
  const picked = useMemo(() => pickTracker('my-quiz'), []);
  const tracker = picked.tracker;

  // Init once.
  const initOnce = useRef(false);
  if (!initOnce.current) {
    initOnce.current = true;
    void tracker.init();
  }

  // Render normally — tracker is the abstract Tracker.
  return <Quiz tracker={tracker} ... />;
}
```

Components stay agnostic. The `kind` discriminator is only useful when you
need to render dev-only UI (like the xAPI statement queue panel under a quiz).

## Why a discriminated union

`tracker.statements` exists on `XapiStubAdapter` but not on
`LernkitScorm12Adapter`. The `kind` discriminator lets TypeScript narrow:

```tsx
{picked.kind === 'xapi-stub' ? (
  <details>
    <summary>xAPI statements emitted ({picked.tracker.statements.length})</summary>
    <pre>{JSON.stringify(picked.tracker.statements, null, 2)}</pre>
  </details>
) : null}
```

Without the discriminator, you'd cast or have to check `instanceof`. The union
is tiny (~5 LoC) and keeps the call sites typesafe.

## Extending

To add another adapter:

```ts
import { LernkitScorm2004Adapter } from '@lernkit/tracker';  // future

export type PickedTracker =
  | { readonly kind: 'scorm12'; readonly tracker: LernkitScorm12Adapter }
  | { readonly kind: 'scorm2004'; readonly tracker: LernkitScorm2004Adapter }
  | { readonly kind: 'xapi-stub'; readonly tracker: XapiStubAdapter };

export function pickTracker(activityId: string): PickedTracker {
  if (typeof window !== 'undefined') {
    if (window.LernkitScorm2004?.available) {
      return { kind: 'scorm2004', tracker: new LernkitScorm2004Adapter() };
    }
    if (window.LernkitScorm12?.available) {
      return { kind: 'scorm12', tracker: new LernkitScorm12Adapter() };
    }
  }
  return { kind: 'xapi-stub', tracker: new XapiStubAdapter(activityId) };
}
```

Detection precedence: prefer the *richer* runtime when both are present (a
package that ships both 1.2 and 2004 manifests for compatibility). 2004 has
sequencing + better state model, so it wins ties.

## Where to go next

- **[Adapters](/tracking/adapters)** — what each adapter does on the wire.
- **[Runtime](/runtime/)** — the `window.LernkitScorm12` runtime in detail.
