---
id: topology
title: Topology — single-SCO vs multi-SCO
sidebar_position: 3
---

# Topology

SCORM 1.2 lets you describe a course as **one SCO with internal navigation**
(single-SCO) or **many SCOs in an organization tree** (multi-SCO). Lernkit
supports both; **single-SCO is recommended** unless you have a specific reason
to ship discrete SCOs.

## Single-SCO (recommended)

```ts
metadata: {
  // ...
  singleSco: true,
  entryLessonId: 'overview',
}
```

What the packager emits:

- One `<item>` and one `<resource adlcp:scormtype="sco" href="<entry>">`.
- The SCO's `<file>` list contains *every* lesson HTML.
- A separate `<resource adlcp:scormtype="asset" identifier="shared-assets">`
  collects every static asset (CSS, JS, fonts).

What the runtime sees:

- One `LMSInitialize` call when the LMS launches the SCO.
- One `LMSFinish` call when the learner exits.
- Internal navigation between lessons happens via Astro's `<ClientRouter />`
  (history.pushState + DOM swap; no full reload), so `pagehide` doesn't fire
  on link clicks.

This is the topology EasyGenerator, Articulate, and iSpring all converge on.
It works smoothly in every observed LMS — SCORM Cloud, PeopleFluent, Cornerstone,
Moodle.

## Multi-SCO (legacy / specialized)

```ts
metadata: {
  singleSco: false,  // or omit
}
```

What the packager emits:

- One `<item>` *and* one `<resource adlcp:scormtype="sco">` per lesson.
- Each SCO's `<resource>` lists only its own `index.html` plus a
  `<dependency identifierref="shared-assets"/>` to the asset bundle.

What the runtime sees:

- One `LMSInitialize` per SCO launch.
- One `LMSFinish` per SCO exit.
- The LMS's TOC drives navigation between SCOs; in-page `<a href>` to *other*
  SCOs is not supported by spec.

Use multi-SCO **only if** you genuinely need per-lesson `cmi.core.lesson_status`
/ `cmi.core.score.raw` reporting and the course has no internal links between
SCOs (typical for a flat list of self-contained micro-lessons).

## Why single-SCO won

Two practical reasons.

### Cross-lesson links break in multi-SCO

In multi-SCO, an `<a href="../other-lesson/">` click in a lesson:
1. Triggers `pagehide` on the current SCO.
2. The runtime calls `LMSFinish`.
3. SCORM Cloud (and most LMSes) interpret this as "the SCO ended; ask the
   learner to pick the next one from the LMS TOC."
4. The iframe internally navigates to the new lesson, but the LMS overlays a
   "Please make a selection to continue" prompt over the iframe.

In single-SCO, all internal nav goes through `<ClientRouter />`. No `pagehide`
fires; the SCORM session stays alive across the whole course.

### Some LMS preview tools refuse multi-SCO

PeopleFluent's preview UI: *"Preview not supported for structured content."*
"Structured content" is industry shorthand for multi-SCO with a hierarchical
`<organization>`. The actual delivery flow may still work, but the preview
doesn't. Single-SCO has one launchable target; previews work everywhere.

## Choosing in code

```ts
metadata: {
  // ...
  singleSco: true,
  entryLessonId: 'overview',
  // Course-level mastery threshold; emitted on the single <item>.
  // If omitted, no mastery is enforced.
  masteryScore: 0.7,
}
```

`entryLessonId` must match a `Lesson.id`. The packager validates and throws if
it doesn't.

## Combining with `<ClientRouter />`

Single-SCO mode **requires** the consuming app to do SPA-style internal
navigation. The `apps/docs` build wires `<ClientRouter />` in
`src/components/CustomHead.astro`:

```astro
---
import Default from '@astrojs/starlight/components/Head.astro';
import { ClientRouter } from 'astro:transitions';
import type { Props } from '@astrojs/starlight/props';
const props = Astro.props as Props;
---
<Default {...props}><slot /></Default>
<ClientRouter />
```

And starlight's component override in `astro.config.mjs`:

```js
starlight({
  components: {
    Head: './src/components/CustomHead.astro',
  },
})
```

Without this, link clicks would still trigger full-page reloads → `pagehide`
fires → `LMSFinish` fires → multi-SCO problem returns even with single-SCO
manifest.

Downstream consumers (other Astro apps using `@lernkit/packagers`) must do the
equivalent.

## Where to go next

- **[LMS portability](/packaging/lms-portability)** — the URL-rewrite cascade
  that makes single-SCO + ClientRouter actually work everywhere.
- **[Tracker → SCORM 1.2 mapping](/tracking/adapters)** — what `cmi.*` calls
  the runtime makes during a single session.
