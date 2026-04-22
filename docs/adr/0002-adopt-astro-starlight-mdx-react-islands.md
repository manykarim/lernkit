---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0002 — Adopt Astro 5 + Starlight + MDX + React islands as the foundation

## Context and Problem Statement

The framework must produce courses that (a) ship as self-contained static HTML inside a SCORM zip and run in LMS iframes with no external server, (b) offer
full-fat interactive widgets (runnable code, quizzes, scenarios) where the author opts in, (c) support content-as-code with Git-backed authoring and a later
UI authoring layer, and (d) include static search that works *offline inside a SCORM package* (no Algolia call-home). The SCORM constraint is the hardest:
every kilobyte of runtime JavaScript is paid by every learner launch of every package.

## Decision Drivers

- **SCORM payload size.** A course zip bundles a full static site. Full-hydration SPAs pay their runtime cost per-package per-learner.
- **Islands architecture.** Only the interactive widgets should ship JS; prose pages should be ~0 KB JS.
- **Static search inside SCORM.** Any search solution that needs an external API (Algolia, MeiliSearch cloud) is disqualified because SCORM packages run
  offline in LMS iframes.
- **MDX 3 support.** Component-rich authoring is the signature DX.
- **Multi-framework islands.** Authors should be able to drop React components today and Vue/Svelte later without rearchitecting.
- **Developer mindshare and stability.** Long-term support matters; single-maintainer risk is a disqualifier for the foundation.
- **Shiki-based syntax highlighting out of the box** (critical for code-first training).

## Considered Options

- **Astro 5 + Starlight + MDX + React islands** (primary)
- **Bare Astro 5 + MDX** (fallback)
- **Fumadocs (Next.js) + MDX**
- **Docusaurus 3**
- **Nextra (Next.js)**
- **VitePress (Vue)**
- **Gatsby**

## Decision Outcome

Chosen option: **Astro 5 + Starlight + MDX + `@astrojs/react` islands**, because it is the only stack surveyed that combines (1) islands architecture (per-page
JS payloads approach zero for prose), (2) Pagefind static search that works inside a SCORM zip with no external service, (3) Zod-typed content collections
aligning with the framework's per-lesson frontmatter schema, (4) Expressive Code (Shiki) built in with copy buttons/titles/diffs, (5) a documented plugin API
(`config:setup`, `i18n:setup`) and explicit component overrides, and (6) first-class multi-framework island support (React today, Vue/Svelte/Solid later
without rearchitecting).

The fallback is **bare Astro + MDX** — chosen if Starlight's docs-theme chrome (sidebar, header, page frame) fights the learning UI (card-based course
catalog, progress dashboards, enrollment flows) or if the SCORM post-build pipeline needs control Starlight's theme doesn't expose.

### Consequences

- **Performance, good:** prose-only lessons ship ~0 KB JS; a SCORM zip of a 20-lesson text-heavy course is dominated by HTML/CSS, not runtime.
- **Performance, bad:** a lesson with a dozen runnable widgets still ships islands, CodeMirror (tree-shaken), and the Pyodide loader — the research flags this
  (~200 KB JS + deferred wasm) as a real cost that must be mitigated per-course.
- **Portability, good:** Pagefind produces a static index (~wasm + JSON chunks) that works in the SCORM iframe without any outbound network call — no other
  framework ships this for free.
- **Portability, good:** same static output serves `plain-html`, `scorm12`, `scorm2004-4th`, `cmi5`, and `xapi-bundle` via post-build packagers (see
  ADR 0015).
- **Clarity, good:** Starlight already solves i18n, versioning, sidebar, and dark-mode — we do not reimplement them.
- **Clarity, bad:** Starlight opinions (sidebar shape, page frame) may need overriding for non-docs learning UIs; the fallback is bare Astro + MDX.
- **Testability, good:** static build is deterministic and diffable in CI; Playwright + Robot Framework drive the same HTML that ships in the SCORM zip.
- **Security, good:** no server-rendered content in the SCORM package means no server-side template injection surface at runtime.

## Pros and Cons of the Options

### Astro 5 + Starlight + MDX + React islands

- Good: islands architecture produces the smallest self-contained HTML+JS payload of any modern MDX framework surveyed — the single deciding factor for
  SCORM.
- Good: Pagefind integration is trivial and works inside a zipped SCORM package (static index, no service).
- Good: content collections + Zod schemas fit the course/lesson/objective metadata model.
- Good: Expressive Code (Shiki) with copy/title/diff built in.
- Good: MIT, Astro-team backed, stable trajectory.
- Good: multi-framework islands (`@astrojs/react`, `@astrojs/svelte`, `@astrojs/vue`, `@astrojs/solid-js`).
- Bad: docs-theme opinions can fight non-docs UIs — fallback to bare Astro if so.

### Bare Astro + MDX

- Good: zero docs-theme constraints.
- Bad: we rebuild sidebar, i18n, search, versioning, dark mode — wasted effort unless Starlight actively fights us.

### Fumadocs (Next.js) + MDX

- Good: best MDX DX among surveyed frameworks — Twoslash, `<include>`, OpenAPI, type-safe content layer via Fumadocs MDX.
- Bad: Next.js ships heavier bundles than Astro — disqualifying for SCORM payload.
- Bad: single-maintainer risk (fuma-nama).
- Bad: rapid breaking changes (v14→v16 in months per the research).
- Bad: diverges from Astro ecosystem the rest of the decisions target. **Reconsider if Fumadocs MDX becomes framework-agnostic.**

### Docusaurus 3

- Good: Meta-backed, safe default, large community.
- Bad: **full-hydration SPA — worst option for SCORM payload size.**
- Bad: Infima CSS tightly coupled (Tailwind/shadcn is fighting upstream).
- Bad: Webpack build is slow.

### Nextra (Next.js)

- Bad: App Router static export has documented caveats; bundles heavier than Astro.
- Bad: inherits Next.js SCORM-unfriendly footprint.

### VitePress

- Bad: Vue-only — wrong ecosystem for the planned React island components and the Sandpack/CodeMirror React integrations.

### Gatsby

- Bad: effectively abandoned post-Netlify acquisition.

## Validation

- Build a minimal "prose-only" course; verify the generated `dist/` ships ~0 KB JS per page.
- Build a course with one `<RunnablePython>` cell; verify only that lesson's page hydrates and the Pyodide wasm is a deferred fetch, not in the initial bundle.
- Pagefind index is generated at build and loaded successfully inside a SCORM Cloud import (no network calls in devtools).
- Lint step fails if any `.astro` or `.mdx` page imports a client-side framework without an `client:*` directive (to prevent accidental site-wide hydration).

## More Information

- Research §2.1–2.2 "Foundation evaluation: Starlight wins".
- Astro docs: https://docs.astro.build/ — islands architecture, content collections, Pagefind integration.
- Starlight: https://starlight.astro.build/.
- Related ADRs: 0007 (Sandpack), 0010 (CodeMirror), 0015 (one-source-many-outputs packaging), 0019 (scoped COOP/COEP).
- Open question: if Fumadocs MDX is extracted as a framework-agnostic package, revisit whether to use it as the MDX layer inside Astro.
