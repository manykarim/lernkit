---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0011 — Use Paged.js + Playwright Chromium for PDF export

## Context and Problem Statement

A technical-training course needs a book-quality PDF export: running headers, chapter breaks, accurate TOC with page numbers, syntax-highlighted code blocks,
inline SVG diagrams, and a sensible fallback for interactive widgets that cannot print. The MDX source and Astro build already produce correct HTML; we must
decide how to turn that HTML into a PDF without rewriting every component in a second rendering engine.

## Decision Drivers

- **Reuse the static HTML.** MDX components, Shiki highlighting, Mermaid SVGs, KaTeX, and images are correct in the Astro build output; rerendering in a
  different engine is waste.
- **Book-quality typography.** Running headers, chapter counters, target-counter TOC with page numbers, `@page` size control, CSS paged-media features.
- **License compatibility.** The default toolchain must be permissive enough for commercial customers to use without a seat license.
- **CI friendliness.** PDF generation must run headless in CI for preview builds.
- **Interactive widgets.** RunnablePython cells, quizzes, and RunnableJS sandboxes cannot print meaningfully — need a print-snapshot fallback that preserves
  pedagogical intent.

## Considered Options

| Approach | Quality | MDX/React support | License | Verdict |
|----------|---------|---------------------|---------|---------|
| **Paged.js + Playwright** | book-quality | consumes rendered HTML | MIT | **Primary** |
| Playwright `page.pdf()` alone | OK | identical | Apache-2.0 | **CI fallback** |
| wkhtmltopdf | poor | low | LGPL | archived — reject |
| Typst | excellent | none | Apache-2.0 | rewrite-only — reject |
| Pandoc + LaTeX | excellent | drops JSX | GPL | loses widgets — reject |
| PrinceXML | excellent | excellent | commercial ~$3,800/server | reject as default |
| WeasyPrint | good | no JS | BSD-3 | Python-only fallback — reject |
| @react-pdf/renderer | OK | reimplement all | MIT | wrong tool — reject |
| md-to-pdf | OK | MD only | MIT | no MDX — reject |

## Decision Outcome

Chosen option: **Paged.js polyfill injected into Astro's static HTML, driven by Playwright-controlled headless Chromium, with `page.pdf({ preferCSSPageSize:
true, printBackground: true })` as the CI-preview fallback.**

### Pipeline

```
astro build
      │
      ▼
 /print route (one document: cover, copyright, TOC, concatenated chapters)
      │
      ▼
 Playwright launches Chromium, page.goto(fileURL), injects paged.polyfill.js
      │
      ▼
 Wait for Paged.js 'after' hook (signals layout complete)
      │
      ▼
 page.pdf({ preferCSSPageSize: true, printBackground: true })
      │
      ▼
 course.pdf
```

### Build-time concerns (locked in)

- **Shiki syntax highlighting** bakes into static HTML at build time — no JS needed in the PDF render pass.
- **Mermaid diagrams** pre-render to inline SVG via `remark-mermaidjs` or `@mermaid-js/mermaid-cli` at build time — not via client-side Mermaid render.
- **KaTeX** renders at build time via `rehype-katex`.
- **D2 / Excalidraw** render to static SVG at build time when used.
- **PlantUML** is a server-rendered SVG endpoint fetched at build time.
- **Images** use Astro's built-in optimization pipeline.

### Paged.js CSS we commit to

- `@page { size: A4; margin: 20mm; }`
- Named strings for running headers: `string-set: chapter content()` on chapter headings; `@top-center { content: string(chapter); }`
- TOC page numbers: `target-counter(attr(href), page)`
- `break-after: page` on chapter ends; `break-inside: avoid` on code blocks and figures
- Printable code-block treatment: reduce font size, enable line wrapping at safe boundaries.

### Interactive widget fallback

Interactive components (`<RunnablePython>`, `<Quiz>`, `<RunnableJS>`, `<Terminal>`, `<Scrim>`, `<ApiPlayground>`) detect `@media print` or a `?print=1` query
flag and swap their render to:

1. A **static snapshot** (source code with Shiki highlighting, quiz questions with answer key in an appendix, screencast keyframe).
2. A **QR code** generated at build time with `qrcode-svg`, linking to the live URL for the interactive version.
3. A **"View interactive version in browser"** callout with the URL printed readably.

This gives the learner the full material in print *and* a trivial path to the live version.

### Playwright-only fallback (CI previews)

For fast preview PDFs in CI (no Paged.js polyfill), we run `page.pdf()` against the concatenated HTML. Quality is acceptable ("OK" not "book-quality"); TOC
page numbers are absent and running headers are basic. `docusaurus-plugin-papersaurus` is a documented reference for this fallback path (cheerio + pdf-parse
+ easy-pdf-merge for TOC patching).

### Consequences

- **Functionality, good:** book-quality PDFs (running headers, accurate TOC, chapter breaks) produced from the same HTML that ships to LMS.
- **Functionality, good:** interactive widgets degrade to a readable + scannable alternative, not to a blank space.
- **Portability, good:** MIT + Apache-2.0 toolchain works for every customer.
- **Portability, good:** Playwright is the same tool used for E2E tests (ADR 0017) and for headless testing of SCORM packages — one Chromium dependency, not
  three.
- **Performance, mixed:** generating a 300-page course PDF takes ~1-3 minutes of Playwright time. Acceptable for build-time; cached per commit.
- **Clarity, bad:** Paged.js adds a polyfill and a separate print route — authors must remember the print fallback contract for new interactive widgets.
  Mitigated by providing a `<PrintFallback>` primitive every interactive component wraps.
- **Testability, good:** visual regression against the PDF is straightforward (pdf-parse → hash per page).

## Pros and Cons of the Options

### Paged.js + Playwright — chosen

- Good: book-quality typography with CSS paged-media on standards-compliant Chromium.
- Good: MIT; no licensing burden.
- Good: consumes rendered HTML — preserves every MDX/React widget without rewrite.
- Bad: Paged.js is a polyfill; some advanced CSS features (e.g. footnotes) are still rough.

### Playwright `page.pdf()` alone

- Good: Apache-2.0; ships with Playwright which we already use for E2E.
- Good: fastest in CI.
- Bad: no TOC page numbers; no running headers; not "book-quality".
- Verdict: **preview fallback only**, acceptable for commit-stage PR previews.

### wkhtmltopdf

- Bad: archived; uses an old Qt WebKit fork; CSS3 paged-media gaps.

### Typst

- Good: excellent typography, actively developed.
- Bad: **no HTML path** — requires rewriting every lesson in Typst source. Eliminates MDX investment.

### Pandoc + LaTeX

- Bad: drops JSX / React components on MD-to-LaTeX conversion. Our entire component model evaporates.

### PrinceXML

- Good: the highest-quality HTML-to-PDF converter on the market; excellent MDX support.
- Bad: commercial ~$3,800/server license. Disqualifies as default for open-source framework.
- Verdict: **optional premium upgrade** if an enterprise customer has Prince already or cares enough to pay.

### WeasyPrint

- Good: BSD-3, nice typography.
- Bad: **no JavaScript execution** — any JS-rendered widget breaks. We pre-render Mermaid/KaTeX at build, but Paged.js itself is JS and WeasyPrint cannot run
  it.

### @react-pdf/renderer

- Bad: completely different component API — we would reimplement every MDX component twice.

### md-to-pdf

- Bad: plain Markdown only; no MDX; no React.

## Validation

- **CI preview build** produces a PDF for the sample course on every PR using the Playwright-only fallback.
- **Release build** produces the full Paged.js-rendered PDF; visual regression (pdf-parse hash per page) blocks drift.
- **Print fallback coverage test**: every interactive component has a `print` mode test that asserts non-blank rendered output and a generated QR code.
- **Typography check** on the release PDF: TOC entries map to correct page numbers; running headers match chapter titles; `break-inside: avoid` respected on
  code blocks.
- **Size sanity**: a 300-page course PDF stays under ~30 MB (Shiki-highlighted code is a common bloat source; we use SVG, not rasterized, highlights).

## More Information

- Research §5 "PDF export: Paged.js + headless Chromium".
- Paged.js: https://pagedjs.org/.
- Playwright: https://playwright.dev/.
- `docusaurus-plugin-papersaurus` is the reference implementation for the fallback path.
- Related ADRs: 0002 (Astro foundation producing the HTML), 0017 (Playwright shared with E2E testing).
- Open question: footnote and index support — deferred until a lesson needs it. Paged.js footnote support is improving.
