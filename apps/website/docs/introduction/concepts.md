---
id: concepts
title: Concepts
sidebar_position: 3
---

# Concepts

Five terms cover most of Lernkit's surface. Bookmark this page; the rest of
the docs assume you know what each means.

## Course

A directory of MDX lessons + Astro/Starlight config + (eventually) a packaging
manifest. Today the framework treats `apps/docs/src/content/docs/<course-root>/`
as the course root; lessons are nested directories under it, each with an
`index.mdx`.

A course is a **single source of truth** that produces one or more
*deliverables* (SCORM zip, xAPI bundle, plain HTML, etc.) per
[ADR 0015](/architecture/adrs/0015-one-source-many-outputs-build-pipeline).

## Lesson

One `index.mdx` file under the course root. Renders to one HTML page. In the
SCORM 1.2 packager's **single-SCO mode** (recommended), all lesson HTMLs get
bundled into a single SCO; the entry lesson is the launch target. In multi-SCO
mode, each lesson is its own SCO with its own SCORM session.

## SCO (Sharable Content Object)

SCORM's name for "the thing the LMS launches." A course can have one SCO
(single-SCO mode — what most modern courses do) or many (multi-SCO mode —
when each lesson really needs its own grade book entry).

## Tracker

The interface every interactive widget uses to report progress. Defined in
`@lernkit/tracker`:

```ts
interface Tracker {
  init(): Promise<boolean>;
  setProgress(progress: number): Promise<void>;
  setBookmark(bookmark: string): Promise<void>;
  recordInteraction(i: Interaction): Promise<void>;
  setScore(score: Score): Promise<void>;
  complete(): Promise<void>;
  pass(): Promise<void>;
  fail(): Promise<void>;
  terminate(): Promise<void>;
  readonly state: TrackerState;
}
```

Three concrete adapters today:

- **`NoopAdapter`** — does nothing. Use in static preview.
- **`XapiStubAdapter`** — accumulates xAPI statements in memory. Use in dev to
  see what would be reported.
- **`LernkitScorm12Adapter`** — bridges to the SCORM 1.2 LMS API. Use in
  packaged builds.

The `pickTracker(activityId)` helper picks one at runtime based on whether
`window.LernkitScorm12` is present (i.e., are we inside a packaged SCO?). See
[pickTracker](/tracking/pick-tracker).

## Packager

The thing that turns a built static site + a `CoursePackage` descriptor into a
deliverable zip. Today: SCORM 1.2 only. Planned: SCORM 2004, xAPI bundle,
cmi5, plain HTML.

```ts
import { packageScorm12 } from '@lernkit/packagers';

const result = await packageScorm12({
  metadata: { courseId: 'my-course', title: 'My Course', version: '1.0.0', language: 'en', singleSco: true },
  lessons: [...],
  distDir: './apps/docs/dist',
});
await writeFile(result.filename, result.zip);
```

See [Packaging](/packaging/) for the full surface.

## Runtime

The browser-side bridge to the LMS. For SCORM 1.2 that's `LernkitScorm12`,
exposed as `window.LernkitScorm12` after the packager injects
`<script src="lernkit-runtime/scorm12.js">` into each lesson's `<head>`. The
runtime handles API discovery (walking the iframe parent chain to find
`window.API`), session lifecycle, error draining, and the `cmi.*` mappings.

A separate runtime ships per packager format: `LernkitScorm2004`, `LernkitXapi`,
etc. as those packagers land. The Tracker adapter is the stable contract; the
runtime can change underneath.

## Mental model

```
   Author          Build              Package             Run
  ─────────       ───────            ─────────           ─────
   .mdx     →   Astro static    →   SCORM zip       →   LMS iframe
  lessons      site (dist/)        (manifest +          loads SCO,
              + react islands      runtime + html)      Tracker
                                                         emits cmi.*
```

Each arrow is a thing the framework owns. Authoring is your job; everything
else is Lernkit's.
