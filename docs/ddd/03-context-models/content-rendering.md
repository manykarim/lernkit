# Content Rendering — Context Model

## Purpose

Turn validated MDX + frontmatter into static HTML augmented by selectively-hydrated React islands. The rendering output must be SCORM-package friendly (smallest possible JS payload per page) and must include a sensible `@media print` fallback for every interactive island (Research §2.2, §6, §5.2).

## Aggregates

- **RenderedCourse** — the `dist/` tree for one Course build. Root of the render output.
- **RenderedLesson** — the HTML + deferred-hydration graph for one Lesson.

## Entities

- _Island_ — one hydrated React component instance. Identified by `(LessonId, IslandKey)` where `IslandKey` is a build-time-stable slot identifier.
- _PageRoute_ — a URL-addressable page (`/courses/py101/loops`).

## Value objects

- *StaticHtml* — the SSR output of a page
- *Hydration* — the `client:load / client:visible / client:idle / client:only` strategy attached to an Island
- *PrerenderedSvg* — Mermaid / D2 / Excalidraw diagrams compiled at build time
- *PrintFallback* — the `@media print` rendering of an Island
- *Snapshot* — a frozen state of an interactive Island suitable for PDF export
- *QrCallback* — the QR-code SVG on a print snapshot linking to the live interactive URL (Research §5.2)
- *BundleBudget* — a numeric byte budget enforced at build against the produced JS for a route

## Domain events

- `PageRendered` — a route has final StaticHtml
- `IslandHydrated` — at runtime, a client-side Island has taken over its slot
- `PrintSnapshotProduced` — a `?print=1` request has generated a snapshot for PDF inclusion
- `BundleBudgetExceeded` — a route exceeded its declared JS budget (build-time warning)

## Application services / use cases

- **RenderLesson** — takes an authored Lesson + component registry, produces `StaticHtml` + hydration descriptors.
- **PrerenderDiagrams** — walks the tree for Mermaid/D2/Excalidraw code fences and generates `PrerenderedSvg` (Research §5.2, §7).
- **GeneratePrintFallback** — for every Island with a declared `PrintFallback`, produce the static snapshot and a `QrCallback`.
- **BuildPagefindIndex** — Pagefind static search index over prose (works inside SCORM zips — Research §2.2).
- **EnforceBundleBudget** — post-build check that per-route JS stays within a declared budget (Research §10.1).

## Integration with other contexts

- **Upstream — [Authoring](./authoring.md):** SK on Component contracts; CS for validated content.
- **Downstream — [Packaging](./packaging.md):** CS; Packaging consumes `dist/` plus the manifest to assemble zips.
- **Downstream — [PDF Rendering](./pdf-rendering.md):** CS; PDF consumes a concatenated `/print` route and the `Snapshot`s.
- **Downstream — [Tracking](./tracking.md):** runtime; rendered Islands *call* the Tracker facade. Rendering does not know *which* adapter is wired — that's chosen by Packaging at build.
- **Downstream — [Code Execution](./code-execution.md) and [RF Execution](./robot-framework-execution.md):** runtime; runnable Islands emit `ExecutionRequest`s.

## Invariants and business rules

1. **Prose pages MUST produce zero JS** — only Islands hydrate (Research §2.2).
2. **Every Island MUST declare either a PrintFallback or be explicitly marked `printable=false`** (fail-build otherwise); ensures [PDF Rendering](./pdf-rendering.md) never hits an un-renderable hole.
3. **PrerenderedSvg is mandatory for diagrams in packages targeting offline LMSes** — SCORM zips cannot fetch Mermaid JS at runtime (Research §5.2).
4. **Cross-origin isolation headers (`COOP: same-origin`, `COEP: require-corp`) are scoped to the code-runner route only**, never site-wide — because setting them globally breaks third-party embeds (Research §4.1, §10.5).
5. **Pagefind index must be emitted into the `dist/` tree** so it works inside a zipped SCORM package (Research §2.2).
6. **Asset URLs in `dist/` MUST be relative or re-writable to relative** so [Packaging](./packaging.md)'s `AssetRewrite` can transform them for LMS iframe embedding (Research §Phase 1 risks).
