# @lernkit/packagers

Standards packagers for Lernkit. **Phase 1 ships SCORM 1.2.** cmi5, SCORM 2004 4th Ed, xAPI bundle, and plain-HTML follow in later phases per [ADR 0015](../../docs/adr/0015-one-source-many-outputs-build-pipeline.md).

## What it does

Takes a built static site — typically the `dist/` output of the Astro docs app — and a `CoursePackage` descriptor, and produces a conformant zip that imports into any SCORM 1.2 LMS.

The zip layout follows SCORM 1.2 conformance rules from research §3.2:

```
lernkit-sample-course-0.0.0-scorm12.zip
├── imsmanifest.xml                  ← at zip root (non-negotiable)
├── metadata.xml                     ← external LOM, referenced via <adlcp:location>
├── adlcp_rootv1p2.xsd               ← ADL Content Packaging schema
├── ims_xml.xsd                      ← supporting XML base types
├── imscp_rootv1p1p2.xsd             ← IMS Content Packaging
├── imsmd_rootv1p2p1.xsd             ← IMS Learning Object Metadata
├── lernkit-runtime/scorm12.js       ← in-browser SCORM API bridge
├── _astro/                          ← shared bundle (CSS/JS)
└── course/<lesson-id>/index.html    ← one HTML per SCO (runtime <script> auto-injected)
```

Hardened against the most common import-failure causes:
- No `__MACOSX/`, no `.DS_Store`, no `Thumbs.db`, no wrapper directory.
- No JSZip-synthesised directory entries (`foo/`, `_astro/` placeholders) — strict Java importers (older Saba, some SuccessFactors builds) iterate `ZipEntry` and choke when these come through with `dir=true`.
- All four ADL CAM XSDs co-resident with `imsmanifest.xml` so strict validators that follow `xsi:schemaLocation` succeed.
- LOM lives in a sibling `metadata.xml` referenced via `<adlcp:location>`, not inline under the manifest's `<metadata>` (the inline-LOM shape is rejected by some application-profile-strict importers).
- Each SCO's `index.html` has the runtime `<script src=".../lernkit-runtime/scorm12.js"></script>` injected automatically by the packager, with the right relative depth. Author HTML doesn't need to opt in.

## Topology — single-SCO (recommended) vs multi-SCO

The packager supports both topologies, opt-in per call:

### Single-SCO (recommended)

`metadata.singleSco: true` plus an `entryLessonId` (defaults to first lesson). The manifest declares **one** `<item>` and **one** `<resource adlcp:scormtype="sco">` whose `href` is the entry lesson; every other lesson HTML is listed as a `<file>` of that SCO. A separate `<resource adlcp:scormtype="asset" identifier="shared-assets">` collects every static asset (CSS, JS, fonts, etc.).

Pairs with **SPA-style internal navigation** in the SCO content (Astro's `<ClientRouter />` is wired in `apps/docs` for exactly this purpose). With SPA nav, link clicks call `history.pushState` instead of triggering a full-page reload, so `pagehide` does NOT fire on internal navigation. The SCORM runtime makes a single `LMSInitialize` at first launch and a single `LMSFinish` at real exit — exactly what SCORM Cloud, SAP SuccessFactors, Cornerstone and other LMS players expect from a SCORM 1.2 course.

This is the topology the EasyGenerator / Articulate / iSpring reference packages all converge on. Use it unless you have a specific reason to ship discrete SCOs.

#### ClientRouter cross-depth navigation — automatic mitigations

Astro's `<ClientRouter />` sequences `doSwap` (DOM swap) **before** `moveToLocation` (`history.pushState`) in `transitions/router.js:196-197`. During a cross-depth navigation (e.g., entry page at depth 1 → lesson page at depth 3), the new page's depth-prefixed asset hrefs (`<link href="../../../_astro/foo.css">`) get inserted into the document while `location.href` still points at the OLD URL. The browser resolves the relative href against the old URL, fetching one path-segment too high — manifesting as **401 (unauthorized scope)** in SCORM Cloud or **404 + text/plain** in PeopleFluent. The packager applies two automatic mitigations so authors don't have to think about this:

1. **`data-astro-transition-persist` on every asset link** in lesson HTML (stylesheets, module scripts, module preloads, the lernkit runtime). The persist id is `<kind>:<basename(url)>` — stable across depth-different hrefs because Astro's content-hashed basenames are unique. ClientRouter's preload-skip check (router.js:154-158) and swap algorithm (`swap-functions.js`) both honor the persist attribute, so a matching id in the old document keeps the existing element in place rather than re-inserting and re-resolving the new (wrong-URL) one.
2. **Stylesheet harmonisation across lessons.** Astro emits some stylesheets (e.g. Expressive Code's `ec.*.css`) only on pages that need them. Without harmonisation, navigating from a page that doesn't reference `ec.j8ofn.css` to one that does would bypass the persist match (no matching id in the old doc) and re-introduce the wrong-URL preload. The packager pre-scans every lesson HTML to compute the union of stylesheets, then ensures every lesson references all of them with the right depth-prefix. The redundant fetches on first load are cached and matter once.

These mitigations are no-ops when `<ClientRouter />` is not present (multi-SCO mode, plain HTML mode); the persist attribute is just an unrecognised `data-*` attribute.

```ts
const result = await packageScorm12({
  metadata: {
    courseId: 'rf-training',
    title: 'Robot Framework Training',
    version: '1.0.0',
    language: 'en',
    masteryScore: 0.7,        // course-level threshold; emitted on the single <item>
    singleSco: true,
    entryLessonId: 'overview', // matches Lesson.id
  },
  lessons: [...],
  distDir: './apps/docs/dist',
});
```

### Multi-SCO (legacy; explicit per-lesson reporting)

`metadata.singleSco: false` (or unset). Each lesson becomes its own SCO with its own SCORM session. Useful when you genuinely need per-lesson `cmi.core.lesson_status` / `cmi.core.score.raw` reporting and the course has no internal links between SCOs (typical for a flat list of self-contained micro-lessons).

Per-lesson `<resource>` lists only its own `index.html` and references a single shared `<resource adlcp:scormtype="asset" identifier="shared-assets">` via `<dependency>`. This collapses ~17×50 file entries to ~17+50 — Moodle / Totara / older SumTotal handle large duplicated manifests poorly. Per-lesson `masteryScore` is opt-in via `Lesson.masteryScore` (course-level mastery is NOT auto-applied per item in this mode).

Caveats with multi-SCO: cross-lesson `<a href>` links inside SCO HTML cause SCORM Cloud to interrupt navigation with "Please make a selection to continue", because every iframe URL change triggers `pagehide` → `LMSFinish` and the LMS expects the next SCO to be selected from its own TOC. If your authored content has cross-lesson links, use single-SCO.

### LMS sub-path portability

LMSes serve SCO content from arbitrary sub-paths (e.g. `https://lms.example.com/scormcontent/<id>/`). Astro / Starlight builds emit root-absolute URLs (`href="/_astro/..."`, `<a href="/rf-training/section-1">`) and worker URLs (`new Worker(new URL("/_astro/foo.worker.js", import.meta.url))`) that resolve to the LMS host root and 404. The packager rewrites these at zip-assembly time:

- **HTML attribute rewrite.** Every `href="/X"`, `src="/X"`, `component-url="/X"`, `renderer-url="/X"`, and `before-hydration-url="/X"` is resolved against the set of zip entries:
  - In-bundle file (`_astro/index.css`) → `'../'.repeat(depth) + X`.
  - In-bundle directory (`/rf-training/cheat-sheet`) → `'../'.repeat(depth) + X + '/index.html'` (LMS file servers don't auto-route directories).
  - Out-of-bundle (`/guides/quickstart`, `/favicon.svg`, `/sitemap-index.xml`, `/`) → the entire attribute is removed. The element renders without the broken link rather than hitting a 404.
  - The Astro-island URL attributes are required because Astro's `<astro-island>` runtime invokes `import()` on them verbatim (`astro-island.js:71-72`); a root-absolute `/_astro/X.js` resolves to `<host>/_astro/X.js` (host root) — wrong path under any LMS sub-path mount. This affects every interactive React island: quizzes, runnable code editors, etc. For `client="visible"`/`"idle"`/`"media"` islands (the only directives the packaged docs use), Astro's directive scheduler defers the `import()` to a later event-loop task that runs after `moveToLocation`/pushState — so the depth-prefixed path resolves against the new document URL even on cross-depth ClientRouter navigations. `client="load"`/`"only"` islands invoke `import()` synchronously during DOM-swap and would still hit the cross-depth timing bug; switch them to `client="visible"` or fold them into the entry HTML if you need cross-depth nav to work.
- **Relative directory-link suffixing.** Starlight's prev/next sibling nav emits `href="../1-2-virtual-environments/"`. The packager appends `index.html` when the resolved target exists in the zip; defensive — leaves unknown directories alone.
- **JS bundle rewrite.** Inside every `_astro/*.js`, double- and single-quoted `"/_astro/<rest>"` literals are rewritten to `"./<rest>"` so worker URLs (`new Worker(new URL(…, import.meta.url))`) resolve against the importing module's URL. Backtick template literals are intentionally skipped (rare in Astro output and risky to rewrite blindly).
- **Expressive Code stylesheet inlining.** Astro's per-grammar EC chunk (`_astro/ec.*.css`) is inlined as a `<style data-astro-transition-persist="style:<basename>">` block in every lesson HTML. The persist+harmonise mechanism prevents wrong-URL preloads in spec-compliant ClientRouter environments (verified in SCORM Cloud), but some enterprise LMSes (PeopleFluent / DB Schenker observed) bypass the persist match for this specific chunk and re-resolve the stylesheet href against a stale document URL during cross-depth navigation, hitting a 404. Inlining removes the URL-resolution surface entirely. Only `ec.*.css` (~18 KB) is inlined — the main `index.*.css` (~62 KB) stays as a `<link>` because it loads cleanly across all observed LMSes and inlining it would duplicate ~1 MB across 17 lesson HTMLs.
- **Idempotent.** Each rewrite checks for the relative-path output shape before firing; running the packager twice produces a byte-identical zip. The injected runtime `<script>` and any already-relative authoring tags are not double-rewritten.
- **What is NOT touched:** `data:` URIs, `https://…` and `//…` URLs, `#anchor`, `mailto:`, `tel:`, `javascript:`, and anything inside CSS bodies (Astro's CSS already inlines tiny SVGs as `data:` and references fonts relatively).

Authors don't need to do anything; the rewrite runs on every `packageScorm12()` call.

## Usage

```ts
import { packageScorm12 } from '@lernkit/packagers';
import { writeFile } from 'node:fs/promises';

const result = await packageScorm12({
  metadata: {
    courseId: 'intro-to-python',
    title: 'Intro to Python',
    version: '0.1.0',
    language: 'en',
    organization: { name: 'Lernkit' },
  },
  lessons: [
    {
      id: 'welcome',
      title: 'Welcome',
      href: 'course/welcome/index.html',
      assets: ['_astro/shared.css'],
      // Per-lesson opt-in: emits <adlcp:masteryscore>80</adlcp:masteryscore>
      // on this item. Only set this on lessons that actually score.
      masteryScore: 0.8,
    },
  ],
  distDir: './apps/docs/dist',
});

await writeFile(result.filename, result.zip);
// Output: intro-to-python-0.1.0-scorm12.zip
```

## Conformance notes

- `<?xml version="1.0" encoding="utf-8"?>` (lowercase `utf-8`; some legacy Java parsers are case-sensitive).
- Manifest declares `<schema>ADL SCORM</schema>` and `<schemaversion>1.2</schemaversion>`.
- Three required namespaces: `imscp_rootv1p1p2`, `adlcp_rootv1p2`, `imsmd_rootv1p2p1`.
- Manifest's `<metadata>` references the external LOM via `<adlcp:location>metadata.xml</adlcp:location>`. The LOM is its own document at the zip root with the IMSMD namespace as default (no `imsmd:` prefix).
- One `<resource adlcp:scormtype="sco">` per lesson, plus a single `<resource adlcp:scormtype="asset" identifier="shared-assets">` collecting every file shared across two or more lessons. SCO resources reference the asset bundle via `<dependency identifierref="shared-assets"/>`.
- `<adlcp:masteryscore>` is **per-lesson opt-in** — set `Lesson.masteryScore` only on items that actually report `cmi.core.score.raw` at runtime. Authoring it without scoring code pins the SCO at "incomplete" forever.
- `Organization` element omits `structure="hierarchical"` (it is the spec default).

## Bundled runtime

The zip ships `lernkit-runtime/scorm12.js` — a ~10 KB browser bootstrap that:

- Discovers the LMS's `window.API` via the canonical SCORM 1.2 algorithm: walks `window.parent` up to 7 levels (cross-origin parent reads guarded by `try/catch` so a `SecurityError` doesn't abort discovery), then recurses into `window.opener`.
- On init, writes `cmi.core.lesson_status = 'incomplete'` whenever the current value is non-terminal (empty / "not attempted" / unknown), idempotently. Skips the write when status is already `completed` / `passed` / `failed` so we don't downgrade real progress.
- Drains `LMSGetLastError` after every failed call and (optionally) emits one `[lernkit-scorm12] LMS<Op>: code=<n> msg="<...>"` warn line per failure. Toggle with `runtime.setDebug(false)`.
- On terminate (registered on `pagehide`, not the cancellable `beforeunload`): writes `cmi.core.exit = 'suspend'` for non-terminal SCOs and `''` for terminal, then `cmi.core.session_time` (`HH:MM:SS.SS`), commits, and finishes.
- Refuses to downgrade `lesson_status` from a terminal value to `incomplete` / `browsed`.
- Enforces the 4 KB `cmi.suspend_data` cap and the 255-char `cmi.core.lesson_location` cap.

Diagnostics surface (read-only at runtime):

```js
window.LernkitScorm12.available;        // boolean — was the API found?
window.LernkitScorm12.getApiVersion();  // '1.2'
window.LernkitScorm12.lastError();      // { code, message, diagnostic } | null
window.LernkitScorm12.setDebug(false);  // silence the console.warn channel
```

The packager auto-injects the runtime `<script>` into each lesson HTML during zip assembly, with the right `../`-prefix for the lesson's nested depth. Authors don't need to add the tag manually; the rewrite is idempotent (skipped if `lernkit-runtime/scorm12.js` is already referenced).

Consumption pattern from lesson code (via [`@lernkit/tracker`](../tracker)):

```ts
import { LernkitScorm12Adapter } from '@lernkit/tracker/adapters/scorm12';

const tracker = new LernkitScorm12Adapter();
await tracker.init();
await tracker.setScore({ scaled: 0.9 });
await tracker.complete();
await tracker.pass();
await tracker.terminate();
```

### scorm-again migration

The bundled runtime is deliberately minimal. Per [ADR 0005](../../docs/adr/0005-scorm-again-as-primary-lms-api-wrapper.md), the production choice is `scorm-again` — gated on the fixed-scope legal memo for its LGPL-3 / MIT mixed licensing ([OQ-P0-12](../../docs/plan/10-open-questions.md)). When the memo clears, the packager will swap to a vendored scorm-again bundle with the same `window.LernkitScorm12` shape; downstream code does not change.

## Optional: bundle the Pyodide runtime for offline-capable delivery

Set `INCLUDE_PYODIDE_RUNTIME=1` when invoking the `apps/docs` packager script (`scripts/package-scorm12.mjs`) to pull every file under `dist/pyodide/` into the zip as a shared asset. This lets `<RunnablePython>` / `<RunnableRobot>` cells work inside an LMS that has no network access to the hosted origin.

- Adds ~6.3 MB (zip-compressed) regardless of course size.
- Files land at `pyodide/` inside the zip; any bundled RF wheels at `pyodide/wheels/`.
- Worker path resolution (`../pyodide/...`) is already correct for both hosted and LMS-mounted delivery — the same binary works in both.

Convenience scripts expose both modes:

```bash
pnpm --filter=@lernkit/docs package:scorm12                          # no runtime, ~160 KB
pnpm --filter=@lernkit/docs package:scorm12:with-runtime              # +6.3 MB
pnpm --filter=@lernkit/docs package:scorm12:rf-training                # no runtime, ~320 KB
pnpm --filter=@lernkit/docs package:scorm12:rf-training:with-runtime   # +6.3 MB, includes RF wheel
```

## Bundled ADL SCORM 1.2 XSDs

The package ships the four ADL CAM schemas at the zip root by default:

- `imscp_rootv1p1p2.xsd`
- `imsmd_rootv1p2p1.xsd`
- `adlcp_rootv1p2.xsd`
- `ims_xml.xsd`

They live in `src/scorm12/schemas/` and are copied into `dist/scorm12/schemas/` by `scripts/copy-assets.mjs`. The packager's `loadScorm12Schemas()` reads any `.xsd` files in that directory and includes them at the zip root so importers that follow `xsi:schemaLocation` can resolve the references.

If you want to omit them (smaller zip, you've validated against your target LMS already), empty the `schemas/` directory before building. The packager treats schema bundling as a no-op when the directory is empty.

## Testing

```bash
pnpm --filter=@lernkit/packagers test         # vitest
pnpm --filter=@lernkit/packagers typecheck    # tsc --noEmit
pnpm --filter=@lernkit/packagers build        # emit dist/
```

End-to-end (from repo root):

```bash
pnpm build:scorm12
# Writes apps/docs/dist-packages/scorm12/lernkit-sample-course-0.0.0-scorm12.zip
```

Verify structure:

```bash
ZIP=apps/docs/dist-packages/scorm12/lernkit-sample-course-0.0.0-scorm12.zip
unzip -l "$ZIP" | head
unzip -p "$ZIP" imsmanifest.xml | head -15
unzip -tq "$ZIP" && echo "zip OK"
```

## Limitations in Phase 1

- No real SCORM Cloud CI round-trip yet (needs a credential; OQ-P0-12 batches this with the legal memo).
- No Moodle / TalentLMS / Docebo smoke test — those arrive in Phase 3 per [`02-phase-plan.md`](../../docs/plan/02-phase-plan.md).
- Asset discovery in the reference docs-app script (`apps/docs/scripts/package-scorm12.mjs`) is conservative — it bundles every file under `_astro/` to every SCO. Phase 1+ will consume Astro's build manifest to trim per-lesson asset lists precisely.
- `recordInteraction` is buffered in the adapter but not yet written to `cmi.interactions.N` (many LMSes silently drop interactions; Phase 1+ wires it once we have a real LMS to verify).
- The HTML/JS path rewrite targets the patterns Astro / Starlight v5 actually emit. CSS-internal `url(/path)` (rare; Astro inlines tiny SVGs as `data:`) and JS template-literal `\`/_astro/...\`` paths are not rewritten. If a future Astro release introduces those, extend `rewriteAbsolutePaths`/`rewriteAstroJsPaths` accordingly.
- Single-SCO mode requires the consuming app to do SPA-style internal navigation (e.g., Astro `<ClientRouter />`). Without it, link clicks still trigger full-page reloads and the runtime will still call `LMSFinish` on every `pagehide` — defeating the single-SCO benefit. The `apps/docs` build wires `<ClientRouter />` in `src/components/CustomHead.astro`; downstream consumers must do the equivalent.
- **In-package fetches must use same-origin credentials.** Browser `fetch()` defaults to `credentials: 'same-origin'`, which is what every lernkit fetch wants when reaching for a same-origin asset inside the SCO (RF wheel, libdoc JSON, etc.). Authoring code that explicitly opts out (`credentials: 'omit'`) returns 401 inside any LMS that gates package files behind a session cookie — SCORM Cloud is the strictest, but most enterprise LMSes do this. The two known fetches in `apps/docs/src/components/rf/` were corrected; if you author a new RF runtime helper that fetches a package-relative path, leave `credentials` at the default.
- **In-package paths in JS must derive from `import.meta.url`, not from a root-absolute string literal.** A literal like `'/rf-libdocs/manifest.json'` resolves to the host root in any LMS sub-path mount → 404. The pattern that works everywhere is `new URL('../rf-libdocs/manifest.json', import.meta.url).href` — `import.meta.url` is the absolute URL of the bundled module, so `../<dir>/` walks back to the package root regardless of mount path or runtime navigation depth.
- **Avoid `.mjs` extensions for assets shipped through enterprise LMS file servers.** Some LMS static-file servers don't have a MIME mapping for `.mjs` and serve it as `application/octet-stream`, which strict-MIME browsers reject for `<script type="module">` and dynamic `import()`. The Pyodide runtime's `pyodide.mjs` is duplicated to `pyodide.module.js` by `apps/docs/scripts/copy-pyodide.mjs` for exactly this reason; the workers import the `.module.js` variant. Apply the same pattern (`.module.js` companion + worker import update) to any future ES module asset.
- **Some LMSes mishandle ClientRouter cross-depth stylesheet preloads despite the persist mechanism.** PeopleFluent / DB Schenker observed: a depth-N page's `<link href="…/X.css">` is preloaded against the OLD document URL during ClientRouter swap, hitting a wrong path and 404. The Astro persist attribute *should* skip this preload, but doesn't in this LMS family. The packager works around it by **inlining** EC's per-grammar stylesheet (`_astro/ec.*.css`) as a `<style>` block in every lesson HTML. If a future LMS surfaces the same issue with a different stylesheet, extend the inline-target list in `zip.ts` accordingly.

## Related ADRs

- [ADR 0003](../../docs/adr/0003-prioritize-cmi5-and-scorm-1-2-with-2004-opt-in.md) — standards strategy.
- [ADR 0004](../../docs/adr/0004-unified-tracker-interface-with-pluggable-adapters.md) — Tracker interface.
- [ADR 0005](../../docs/adr/0005-scorm-again-as-primary-lms-api-wrapper.md) — chosen runtime wrapper.
- [ADR 0015](../../docs/adr/0015-one-source-many-outputs-build-pipeline.md) — the build pipeline shape.
