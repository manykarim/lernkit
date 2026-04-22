# PDF Rendering — Context Model

## Purpose

Produce book-quality PDFs from the same Course source via Paged.js + Playwright-driven headless Chromium (Research §5). Falls back to bare `page.pdf()` for preview PDFs in CI. Every interactive Island must render a graceful static snapshot plus a `QrCallback` to the live URL (Research §5.2).

## Aggregates

- **PrintJob** — one PDF generation request for one Course version. Aggregate root because it owns the concatenated `/print` route rendering, Paged.js pagination, and the final PDF asset.

## Entities

- _PagedDocument_ — the concatenated HTML feed into Paged.js.
- _Chapter_ — per-Lesson section with page breaks, chapter counters, running headers.

## Value objects

- *PrintFallback* — declared by every Island (see [Content Rendering invariant 2](./content-rendering.md))
- *Snapshot* — frozen island state
- *QrCallback* — QR-code SVG pointing to the live URL
- *PageRules* — `@page { ... }` stylesheet slice
- *PdfMetadata* — `{title, author, subject, keywords, producer}`

## Domain events

- `PrintJobStarted`
- `PagedDocumentAssembled`
- `SnapshotsCollected` — all Islands contributed their `Snapshot` + `QrCallback`
- `ChromiumPaginated` — Paged.js `after` hook fired
- `PdfProduced`
- `PdfFallbackUsed` — Paged.js failed; bare `page.pdf()` path taken (CI preview)

## Application services / use cases

- **StartPrintJob** — creates a PrintJob keyed on `(CourseId, Version, TemplateFlags)`.
- **AssemblePagedDocument** — builds the `/print` route: cover, copyright, TOC placeholder, chapters in order.
- **CollectSnapshots** — drives every `?print=1` request to its Island to capture the static snapshot.
- **DriveChromium** — Playwright `goto → wait for paged:after → page.pdf({ preferCSSPageSize, printBackground })`.
- **PatchTocPageNumbers** — post-pass for the TOC page-number target-counter references (Research §5.2).

## Integration with other contexts

- **Upstream — [Content Rendering](./content-rendering.md):** CS — consumes static HTML + Snapshots.
- **Upstream — [Authoring](./authoring.md):** reads the Course manifest for TOC structure and PdfMetadata.
- **Downstream — [Packaging](./packaging.md):** CS — the PDF is one export alongside zips.
- **No runtime integration** — PDF is strictly build-time.

## Invariants and business rules

1. **Every Island MUST have declared a PrintFallback** (enforced in Content Rendering's build).
2. **Mermaid / D2 / Excalidraw diagrams are PrerenderedSvg at build time**; PDF pipeline does not re-run their JS (Research §5.2, §7).
3. **KaTeX math is also server-rendered into HTML** before Paged.js sees the document.
4. **Paged.js is the primary path**; `page.pdf()` alone is the CI preview fallback (Research §5.1).
5. **PDF output is reproducible** — given identical inputs, byte-identical PDFs (modulo the `/CreationDate`, which is scrubbed to a fixed value).
6. **`QrCallback` URLs point to the versioned live route** — `https://.../courses/py101@1.3/loops` — so a QR scanned years later still lands correctly.
