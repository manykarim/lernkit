---
id: lms-portability
title: LMS sub-path portability
sidebar_position: 4
---

# LMS sub-path portability

LMSes serve SCO content from arbitrary sub-paths (e.g.,
`https://lms.example.com/scormcontent/<id>/`,
`https://learning.dbschenker.com/schenker/.../glob_it_cdp_skills_TM_12/9/`).

Astro / Starlight builds emit URLs that assume hosting at the host root
(`href="/_astro/..."`, `<a href="/rf-training/section-1">`,
`new Worker(new URL("/_astro/foo.worker.js", import.meta.url))`). All of
these resolve to the LMS *host root* in a sub-path mount, which 404s.

The packager rewrites these at zip-assembly time. This page documents the
full cascade — useful when debugging a new LMS variant.

## 1. HTML attribute rewrite

Every `href="/X"`, `src="/X"`, `component-url="/X"`, `renderer-url="/X"`,
and `before-hydration-url="/X"` is resolved against the set of zip entries:

- **In-bundle file** (`/_astro/index.css`) → `'../'.repeat(depth) + X`.
- **In-bundle directory** (`/rf-training/cheat-sheet`) →
  `'../'.repeat(depth) + X + '/index.html'` (LMS file servers don't auto-route
  directories).
- **Out-of-bundle** (`/guides/quickstart`, `/favicon.svg`,
  `/sitemap-index.xml`, `/`) → the entire attribute is removed. The element
  renders without the broken link rather than hitting a 404.

The Astro-island URL attributes (`component-url`, `renderer-url`,
`before-hydration-url`) are required because Astro's `<astro-island>` runtime
invokes `import()` on them verbatim
([`astro-island.js:71-72`](https://github.com/withastro/astro/blob/main/packages/astro/src/runtime/server/astro-island.ts));
a root-absolute `/_astro/X.js` resolves to `<host>/_astro/X.js` — wrong path
under any LMS sub-path mount. This affects every interactive React island:
quizzes, runnable code editors, etc.

For `client="visible"` / `"idle"` / `"media"` islands (the only directives
used in the docs), Astro's directive scheduler defers the `import()` to a
later event-loop task that runs after `moveToLocation`/pushState — so the
depth-prefixed path resolves against the new document URL even on cross-depth
ClientRouter navigations. `client="load"` / `"only"` islands invoke `import()`
synchronously during DOM-swap and would still hit the cross-depth timing bug;
switch them to `client="visible"` if you need cross-depth nav to work.

## 2. Relative directory-link suffixing

Starlight's prev/next sibling nav emits
`href="../1-2-virtual-environments/"`. The packager appends `index.html` when
the resolved target exists in the zip; defensive — leaves unknown directories
alone.

## 3. JS bundle rewrite

Inside every `_astro/*.js`, double- and single-quoted `"/_astro/<rest>"`
literals are rewritten to `"./<rest>"` so worker URLs
(`new Worker(new URL(…, import.meta.url))`) resolve against the importing
module's URL.

Backtick template literals are intentionally skipped (rare in Astro output
and risky to rewrite blindly).

## 4. Astro's ClientRouter cross-depth race

Astro's `<ClientRouter />` (in `transitions/router.js:196-197`) sequences
`doSwap` (DOM swap) **before** `moveToLocation` (`history.pushState`). During
a cross-depth navigation (e.g., entry page at depth 1 → lesson page at depth
3), the new page's depth-prefixed asset hrefs (`<link href="../../../_astro/foo.css">`)
get inserted into the document while `location.href` still points at the OLD
URL. The browser resolves the relative href against the old URL, fetching one
path-segment too high — manifesting as **401 (unauthorized scope)** in SCORM
Cloud or **404 + text/plain** in PeopleFluent.

The packager applies three automatic mitigations so authors don't have to
think about this:

### `data-astro-transition-persist` on every asset link

Stylesheets, module scripts, module preloads, and the lernkit runtime all get
`data-astro-transition-persist="<kind>:<basename(url)>"`. The persist id is
stable across depth-different hrefs because Astro's content-hashed basenames
are unique. ClientRouter's preload-skip check
([`router.js:154-158`](https://github.com/withastro/astro/blob/main/packages/astro/src/transitions/router.ts))
and swap algorithm (`swap-functions.js`) both honour the persist attribute,
so a matching id in the old document keeps the existing element in place
rather than re-inserting and re-resolving the new (wrong-URL) one.

### Stylesheet harmonisation across lessons

Astro emits some stylesheets (e.g., Expressive Code's `ec.*.css`) only on
pages that need them. Without harmonisation, navigating from a page that
doesn't reference `ec.j8ofn.css` to one that does would bypass the persist
match (no matching id in the old doc) and re-introduce the wrong-URL preload.
The packager pre-scans every lesson HTML to compute the union of stylesheets,
then ensures every lesson references all of them with the right depth-prefix.

### Inline `<style>` for `ec.*.css` (defense-in-depth)

The persist+harmonise mechanism prevents wrong-URL preloads in spec-compliant
ClientRouter environments (verified in SCORM Cloud), but some enterprise LMSes
(PeopleFluent / DB Schenker observed) bypass the persist match for this
specific chunk and re-resolve the stylesheet href against a stale document URL
during cross-depth navigation, hitting a 404. **Inlining** the CSS as a
`<style>` block removes the URL-resolution surface entirely. Only `ec.*.css`
(~18 KB) is inlined — the main `index.*.css` (~62 KB) stays as a `<link>`
because it loads cleanly across all observed LMSes and inlining it would
duplicate ~1 MB across 17 lesson HTMLs.

## 5. Idempotency

Each rewrite checks for the relative-path output shape before firing; running
the packager twice produces a byte-identical zip. The injected runtime
`<script>` and any already-relative authoring tags are not double-rewritten.

## What is NOT touched

- `data:` URIs.
- `https://…` and `//…` URLs.
- `#anchor` fragments.
- `mailto:`, `tel:`, `javascript:` URIs.
- Anything inside CSS bodies (Astro's CSS already inlines tiny SVGs as
  `data:` and references fonts relatively).

## Where to go next

- **[LMS deployment troubleshooting](/lms-deployment/)** — symptom → fix matrix
  for the LMSes we've observed.
- **[Tracking interface](/tracking/interface)** — how the rewrite fits into
  the bigger picture.
