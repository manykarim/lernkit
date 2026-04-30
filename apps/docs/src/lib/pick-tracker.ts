import { LernkitScorm12Adapter, XapiStubAdapter, type Tracker } from '@lernkit/tracker';

/**
 * Returns the right Tracker for the current runtime:
 * - SCORM 1.2 package (window.LernkitScorm12 wired in by the packager) → LernkitScorm12Adapter
 * - Anywhere else (dev preview, plain web)                              → XapiStubAdapter
 *
 * The XapiStubAdapter exposes `statements` for the in-page debug panel; the SCORM adapter
 * does not, so callers that read that field should branch on the returned `kind`.
 */
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
