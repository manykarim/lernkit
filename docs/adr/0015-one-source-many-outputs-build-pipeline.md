---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0015 — Build one static source into many standards-packaged outputs

## Context and Problem Statement

A single course must publish as SCORM 1.2, SCORM 2004 4th Ed, cmi5, raw xAPI, and plain HTML (ADR 0003 locks those standards in). The build system must
produce all five from the **same** MDX source tree — otherwise authors maintain parallel copies and drift is inevitable. The build must also generate the
correct manifests for each standard (`imsmanifest.xml` with varying schema versions, `cmi5.xml`, xAPI bundle config), wire the correct Tracker adapter into
each output (ADR 0004), and not ship unused adapter code in any target.

## Decision Drivers

- **Single source of truth.** MDX lessons under `src/content/courses/**/*.mdx` are authored once.
- **One static build.** The Astro static build runs once; each packager post-processes the output.
- **Adapter injection at packaging time** — not runtime detection — to keep bundles small and Tracker-target explicit.
- **Manifest correctness.** Every target's manifest must be valid against its schema; a failure here is an LMS import failure at the customer.
- **Deterministic builds.** Same source → same bytes out, for diffability and caching in CI.
- **Separation of concerns.** Packagers are Node scripts consuming a `dist/` + a `manifest.json`; they don't know about Astro internals.

## Considered Options

- **A:** MDX → one Astro static build → unified JSON manifest → five packagers, each producing the target standard.
- **B:** Five parallel Astro builds, one per target (with different adapter imports at build time).
- **C:** Single Astro build; runtime detection in the adapter code branches per target.
- **D:** Separate source trees per target.

## Decision Outcome

Chosen option: **A — MDX → single Astro static build → unified manifest JSON (from frontmatter) → five packagers (`scorm12`, `scorm2004-4th`, `cmi5`,
`xapi-bundle`, `plain-html`).**

### The pipeline

```
src/content/courses/**/*.mdx (frontmatter + content)
            │
            ▼
     astro build  →  dist/     (React islands hydrate only runnable widgets — ADR 0002)
            │
            ▼
  Build-time scripts extract frontmatter → unified manifest.json
            │
   ┌────────┼──────────┬────────────┬──────────────┐
   ▼        ▼          ▼            ▼              ▼
 scorm12  scorm2004  cmi5       xapi-bundle    plain-html
 .zip     -4th.zip   .zip       (dist + cfg)   (dist as-is)
```

### What each packager does

- **`scorm12`:** copy `dist/` into a working directory; inject `ScormAgainAdapter12` into the entry JS; render `imsmanifest.xml` from a Nunjucks template fed
  by `manifest.json`; zip with `imsmanifest.xml` at root; verify no `__MACOSX/`, no `.DS_Store`; assert suspend_data serialization fits 4,096 chars.
- **`scorm2004-4th`:** same, with `ScormAgainAdapter2004`; 2004 manifest template with sequencing namespaces; 64,000-char suspend_data budget; ISO-8601
  `session_time`.
- **`cmi5`:** inject `Cmi5Adapter`; render `cmi5.xml` from template; zip per cmi5 spec.
- **`xapi-bundle`:** inject `XapiAdapter`; emit a config JSON with the xAPI endpoint configuration (the LRS URL and activity IDs); no zip — this is a
  directory deliverable.
- **`plain-html`:** inject `NoopAdapter`; no manifest; serves as SEO-discoverable public marketing / preview, and as the source for the PDF pipeline
  (ADR 0011).

### Adapter injection mechanism

At build time (not runtime), the packager replaces a well-known sentinel import in the entry JS (e.g. `import { Tracker } from 'virtual:lernkit/tracker'`)
with the target-specific adapter module. Implemented as a small Vite / Astro integration plugin. Result: tree-shaking eliminates every other adapter from the
output — a SCORM 1.2 package ships only `ScormAgainAdapter12`, not all five.

### Unified manifest schema

`manifest.json` is the single intermediate artifact. Frontmatter fields from research §6.9 populate it:

```json
{
  "courseId": "slug",
  "version": "1.2.3",
  "title": "...",
  "description": "...",
  "language": "en",
  "objectives": [...],
  "masteryScore": 0.8,
  "cmi5MoveOn": "Passed",
  "tags": [...],
  "estimatedDuration": "PT2H30M",
  "prerequisites": [...],
  "lessons": [
    { "id": "slug", "title": "...", "href": "lessons/slug/", "durationSec": 900, ... }
  ]
}
```

All packager templates consume this JSON. Frontmatter is Zod-validated at `astro build`; if a course lacks a required field, the build fails before any
packager runs.

### Template engine for manifests

**Nunjucks** (or Handlebars — either works; Nunjucks is chosen for Jinja-like syntax that matches Robot Framework authors' muscle memory). Templates live at
`packagers/scorm12/imsmanifest.njk`, `packagers/scorm2004-4th/imsmanifest.njk`, `packagers/cmi5/cmi5.njk`. Deterministic output, no non-deterministic date
stamps at package time (ADR 0003 locks stable IRIs — same rule applies to manifest identifiers).

### Consequences

- **Functionality, good:** one source → five outputs, no author-visible duplication.
- **Performance, good:** adapter injection at build time means each package ships only its adapter (10 KB instead of 50 KB of accumulated Tracker code).
- **Clarity, good:** packagers are small, testable, independent Node scripts. Adding a sixth standard (AICC, future xAPI 2.1) is one new packager directory.
- **Clarity, good:** frontmatter schema is the single contract between authors and packagers; changes surface as type errors, not runtime surprises.
- **Testability, good:** each packager's output can be unit-tested (zip shape, manifest XML validation, adapter presence) without running a real LMS.
- **Portability, good:** `plain-html` is the same HTML Paged.js consumes (ADR 0011) — PDF pipeline and SCORM pipeline share the Astro build.
- **Testability, good:** the `manifest.json` is the queryable single source for CI — Astro course search, Pagefind index, learner dashboard all consume it.
- **Clarity, bad:** five parallel outputs + manifests means engineers new to the repo have one more concept to learn; mitigated by per-packager README.

## Pros and Cons of the Options

### A — Single build + five packagers — chosen

- Good: clean separation of rendering (Astro) from packaging (Node scripts).
- Good: deterministic; reproducible.
- Bad: packagers must stay in sync with the Tracker interface (ADR 0004); enforced by contract tests.

### B — Five parallel Astro builds

- Bad: 5× build time; most of the work (HTML, Shiki, Mermaid) is identical across targets.
- Bad: any build non-determinism shows up as five different outputs.

### C — Runtime target detection in adapters

- Bad: every package ships every adapter's code path (rejected already in ADR 0004 for the same reason).

### D — Separate source trees

- Bad: authors maintain parallel copies of the same lesson — guaranteed drift; defeats the purpose of the framework.

## Build and asset hygiene rules

- **No absolute URLs** baked into the bundled assets — a post-build URL rewriter converts absolute links to path-relative so assets work inside an LMS iframe
  that serves the zip from a nested URL (research §Phase 1 risks).
- **Asset paths are lowercase and ASCII-only** — avoids LMS filesystem case-sensitivity surprises.
- **No `__MACOSX/`, no `.DS_Store`** in the zip — explicit check in the packager's pre-zip step.
- **`imsmanifest.xml` must be at the zip root** — checked by unit tests.
- **Deterministic zip timestamps** — set to a fixed epoch so re-builds from the same source produce identical hashes.

## Validation

- **Packager unit tests** for each target: manifest XML validates against its XSD; zip shape correct; adapter module present; required frontmatter fields
  present in manifest.json.
- **Integration test:** the sample course builds and imports cleanly into SCORM Cloud for each of SCORM 1.2, SCORM 2004 4th, cmi5 (ADR 0017).
- **Determinism check:** building the same source twice produces identical zip SHA-256 hashes.
- **Size budget:** per-target adapter + Tracker code stays under 10 KB gzipped inside the output (reuses the budget from ADR 0004).
- **Tracker contract test:** every packager's output, when launched against a stub LRS / LMS, exercises every `Tracker` method and produces the expected
  statements / API calls.

## More Information

- Research §3.5 "The one-source-many-outputs build pipeline".
- Research §7 "Tool stack proposal" (the build-pipeline diagram is the canonical shape).
- Nunjucks: https://mozilla.github.io/nunjucks/.
- Related ADRs: 0002 (Astro produces the dist), 0003 (which standards), 0004 (Tracker interface the adapters implement), 0005 (scorm-again the adapters
  wrap), 0011 (Paged.js consumes the same HTML).
- Open question: do we publish the `plain-html` target as a SEO-friendly public site automatically, or require opt-in? Deferred; policy decision per tenant.
