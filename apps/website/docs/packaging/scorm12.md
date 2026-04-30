---
id: scorm12
title: SCORM 1.2 packager
sidebar_position: 2
---

# SCORM 1.2 packager

`packageScorm12` consumes a built static site + a `CoursePackage` descriptor
and produces a SCORM 1.2 zip ready for LMS import. The implementation lives
under `packages/packagers/src/scorm12/`.

## Minimum usage

```ts
import { packageScorm12 } from '@lernkit/packagers';
import { writeFile } from 'node:fs/promises';

const result = await packageScorm12({
  metadata: {
    courseId: 'rf-training',
    title: 'Robot Framework Training',
    version: '1.0.0',
    language: 'en',
    singleSco: true,
    entryLessonId: 'overview',
  },
  lessons: [
    { id: 'overview',     title: 'Overview',           href: 'rf-training/index.html',
      assets: ['_astro/index.css', '_astro/page.js'] },
    { id: 'install',      title: 'Install Python',     href: 'rf-training/section-1/1-1-install-python/index.html',
      assets: [/* shared + per-lesson assets */] },
    // ...
  ],
  distDir: './apps/docs/dist',
});

await writeFile(`./out/${result.filename}`, result.zip);
```

## What goes in the zip

The packager produces this layout, regardless of how many lessons you have:

```
my-course-1.0.0-scorm12.zip
├── imsmanifest.xml                 # at zip root, non-negotiable
├── metadata.xml                    # external LOM, referenced via <adlcp:location>
├── adlcp_rootv1p2.xsd              # ADL Content Packaging schema
├── ims_xml.xsd                     # supporting XML base types
├── imscp_rootv1p1p2.xsd            # IMS Content Packaging
├── imsmd_rootv1p2p1.xsd            # IMS Learning Object Metadata
├── lernkit-runtime/scorm12.js      # in-browser SCORM API bridge
├── _astro/                         # shared bundle (CSS / JS)
└── <course-root>/<lesson-id>/index.html  # one per lesson
```

Per [research §3.2](/architecture/adrs/0015-one-source-many-outputs-build-pipeline)
and the strict-LMS observations baked into the manifest shape:

- No `__MACOSX/`, no `.DS_Store`, no `Thumbs.db`, no wrapper directory.
- No JSZip-synthesised directory entries (some Java importers reject these).
- All four ADL CAM XSDs co-resident with `imsmanifest.xml` so strict
  validators that follow `xsi:schemaLocation` succeed.
- LOM lives in a sibling `metadata.xml` referenced via `<adlcp:location>`,
  not inline under the manifest's `<metadata>` (the inline-LOM shape is
  rejected by some application-profile-strict importers).
- Each SCO HTML has the runtime `<script>` injected automatically with the
  right relative depth.

## Configuration

### `CourseMetadata`

| Field | Type | Required | Notes |
|---|---|---|---|
| `courseId` | `string` | yes | Becomes the `<manifest identifier>`; kebab-case ASCII recommended |
| `title` | `string` | yes | Shown in LMS catalog |
| `description` | `string` | no | Up to ~2000 chars for LMS compat |
| `version` | `string` | yes | Semver; bumping signals re-publish |
| `language` | `string` | yes | ISO 639-1 (e.g. `'en'`) |
| `organization` | `Organization` | no | `{ name, identifier? }` |
| `objectives` | `readonly string[]` | no | Currently unused by the packager; reserved |
| `masteryScore` | `number` | no | `[0..1]`. In `singleSco` mode emits `<adlcp:masteryscore>` on the single item |
| `estimatedMinutes` | `number` | no | Currently unused; reserved |
| `singleSco` | `boolean` | no | `true` → single-SCO topology (recommended). Default: `false` |
| `entryLessonId` | `string` | no | Required when `singleSco: true`; matches a `Lesson.id` |

### `Lesson`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | Stable identifier; becomes the SCO/item ID in the manifest |
| `title` | `string` | yes | Sidebar / TOC label |
| `href` | `string` | yes | Path to the lesson's entry HTML, relative to `distDir` |
| `assets` | `readonly string[]` | yes | Files this lesson references |
| `masteryScore` | `number` | no | Per-lesson opt-in; in multi-SCO mode emits `<adlcp:masteryscore>` |

### `PackagerOptions`

| Field | Type | Notes |
|---|---|---|
| `filter` | `(path: string) => boolean` | Omit files from the zip (e.g., source maps, `.astro/`) |

## What the packager does

1. **Manifest:** renders `imsmanifest.xml` from the Nunjucks template; emits
   `metadata.xml` separately.
2. **XSDs:** copies the four ADL CAM XSDs into the zip root (vendored under
   `packages/packagers/src/scorm12/schemas/`).
3. **Runtime:** copies `lernkit-runtime/scorm12.js` into the zip and *injects*
   `<script src="…/lernkit-runtime/scorm12.js"></script>` into the head of
   every lesson HTML on the way in (depth-aware relative path).
4. **HTML rewrite:** root-absolute attribute values
   (`href="/X"`, `src="/X"`, `component-url="/X"`, `renderer-url="/X"`,
   `before-hydration-url="/X"`) get rewritten to depth-prefixed relative
   paths or stripped (out-of-bundle). Already-relative directory-style links
   (Starlight prev/next nav) get `index.html` suffixed.
5. **JS bundle rewrite:** `"/_astro/<rest>"` literals in `_astro/*.js` get
   rewritten to `"./<rest>"` so worker URLs resolve against the importing
   module's URL.
6. **ClientRouter cross-depth handling:**
   - `addAstroTransitionPersist` adds `data-astro-transition-persist="<kind>:<basename>"`
     to every stylesheet, module preload, module script, and the runtime
     script.
   - `harmoniseStylesheets` ensures every lesson references the union of
     stylesheets used anywhere in the course (the persist match needs the
     same id in old and new docs to fire).
   - `inlineStylesheets` inlines `_astro/ec.*.css` as a `<style>` block on
     every page — some LMSes bypass the persist match for this specific
     chunk; inlining removes the URL-resolution surface entirely.

## What the packager doesn't do

- **Generate the static site.** That's Astro/Starlight's job; the packager
  consumes `distDir`.
- **Bundle the Pyodide runtime.** The `apps/docs/scripts/package-scorm12.mjs`
  wrapper bundles it under `pyodide/` when `INCLUDE_PYODIDE_RUNTIME=1` is set;
  the core packager doesn't know about Pyodide.
- **Validate semver.** `metadata.version` is a string; you choose the convention.

## Where to go next

- **[Topology](/packaging/topology)** — single-SCO vs multi-SCO.
- **[LMS portability](/packaging/lms-portability)** — the rewrite cascade in detail.
- **[API reference](/api/packagers)** — generated from TSDoc.
