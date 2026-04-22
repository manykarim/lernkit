---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0012 — Use Keystatic as the primary UI authoring layer; Sveltia CMS fallback; Markdoc for author-safe content

## Context and Problem Statement

Content-as-code is the primary authoring model: MDX files under `src/content/courses/**/*.mdx` with Zod-typed frontmatter, Git-backed. But the framework must
also serve instructional designers and subject-matter experts who will not edit MDX in an IDE. We need a lightweight UI editor that writes the same files
developers write — no separate database, no schema duplication — so there is one source of truth.

## Decision Drivers

- **Content-as-code primary.** The UI editor must write directly to the same `src/content/**` files Astro reads. A database-backed CMS forks the content
  model.
- **No operational burden at the default tier.** Hosting a CMS database alongside the site is unnecessary complexity.
- **Astro-native.** Official Astro documentation guidance should be followed where relevant.
- **Developer DX.** Schemas defined in TypeScript should be reused between the Astro content collection config and the editor.
- **Dual-mode.** Developers edit locally in Git; editors edit via a web UI backed by a Git workflow (PRs).
- **MDX / Markdoc / YAML / JSON native.** No proprietary intermediate format.
- **Maintenance cadence.** The editor is not the primary product but is on the critical path for authors; we need a maintained tool.

## Considered Options

- **A:** Keystatic (Thinkmill, MIT) primary; Sveltia CMS (MIT) fallback; Markdoc optional for author-safe content.
- **B:** TinaCMS.
- **C:** Payload CMS.
- **D:** Decap CMS (formerly Netlify CMS).
- **E:** Sanity.
- **F:** Outstatic.
- **G:** Contentlayer.
- **H:** No UI editor — content-as-code only, forever.

## Decision Outcome

Chosen option: **A — Keystatic as the primary UI authoring layer; Sveltia CMS ready as drop-in fallback; Markdoc optional for author-safe content zones.**

### Keystatic rationale (from research §2.3)

- **Astro docs officially recommend it.** Integrations are maintained.
- **Generates the exact `src/content/` files** Astro content collections already read — one source of truth, no DB.
- **TypeScript-first schema API** with first-class MDX, Markdown, Markdoc, YAML, JSON — matches our frontmatter/content model.
- **Dual-mode:** local filesystem for developers, GitHub PR-based for editors. The editor UI is the same in both modes.
- **Free Keystatic Cloud up to three users.** Self-hosts trivially on Hetzner / Coolify as part of the Astro app itself (no separate deployment).
- **MIT license.**

### Sveltia CMS fallback rationale

Keystatic is maintained by Thinkmill — a small shop; some community sources flag maintenance cadence as a risk. **Sveltia CMS (MIT)** is the drop-in fallback:

- Config-compatible with Decap / Netlify CMS (so many existing Decap configs work).
- ~5× smaller bundle than Decap.
- Actively maintained.
- Pure-static JS admin panel that talks to GitHub via the GitHub REST API.
- Use when editors need a standalone admin UI decoupled from the site framework, or when Keystatic's cadence stalls.

### Markdoc for author-safe content (optional)

**Markdoc** (Stripe, MIT) is recommended for content authored by non-developers or AI systems. Markdoc:

- Validates tags at *build time*, not at render — a typo in `{% quiz %}` fails the build with a line number.
- Has a constrained syntax (no arbitrary JavaScript) — safer for AI-generated content.
- Starlight supports both MDX and Markdoc formats side by side.

**Policy:** MDX is the default for developer-authored lessons; Markdoc is the opt-in format for author-edited / AI-assisted content zones.

### Custom block integration with Keystatic

For each interactive component (Quiz, RunnablePython, Terminal, Scenario, etc.), we provide a Keystatic custom block schema so editors can compose lessons
with typed forms instead of raw MDX. The block schema matches the component's props — changes to either side ripple to both. This is the work planned for
Phase 4 in the research roadmap.

### Consequences

- **Usability, good:** non-developer authors get a schema-validated UI with live preview without sacrificing Git-backed content-as-code.
- **Portability, good:** the same lesson is editable by an IDE user and a UI user — no "you must edit in Keystatic only" lock-in.
- **Clarity, good:** schemas are declared once (TypeScript) and consumed by both Astro content collections and Keystatic block definitions.
- **Clarity, bad:** maintaining Keystatic block schemas for every interactive component is ongoing work; Sveltia does not need this, so the fallback is
  genuinely viable if Keystatic cadence falters.
- **Security, good:** no database, no server-side admin surface at runtime in the default config; GitHub PAT / GitHub App handles auth for the PR-based mode.
- **Security, good with caveat:** Markdoc-authored zones are constrained to a vetted tag palette — safer for AI or less-trusted authors.
- **Portability, bad (Keystatic Cloud):** the Cloud free tier is 3 users; beyond that, authors either self-host Keystatic (one static app) or move to the
  paid Cloud. Documented clearly.

## Pros and Cons of the Options

### A — Keystatic primary / Sveltia fallback / Markdoc optional — chosen

- Good: content-as-code fidelity; no DB; Astro-recommended.
- Good: typed block schemas tie UI forms to component props.
- Bad: Keystatic maintenance cadence is a real (documented) risk — addressed by keeping Sveltia drop-in ready.

### B — TinaCMS

- Bad: DB + serverless function requirement — adds ops weight at odds with our "no DB at default tier" goal.
- Bad: even in its "open authoring" mode, the architectural center of gravity is DB-first.

### C — Payload CMS

- Bad: DB-first (MongoDB/Postgres). Great product but wrong shape for content-as-code.

### D — Decap CMS

- Bad: **in maintenance mode**; Sveltia is its actively maintained successor.

### E — Sanity

- Bad: not Git-backed — content lives in Sanity's cloud-hosted content lake. Entirely different model.

### F — Outstatic

- Bad: **Next.js only** — incompatible with our Astro foundation.

### G — Contentlayer

- Bad: **abandoned.** Research §2.3 flags this explicitly.

### H — No UI editor

- Good: zero ongoing Keystatic-schema maintenance.
- Bad: excludes non-developer authors who are a primary user persona — especially in Phase 4+.

## Validation

- **Round-trip test:** an editor opens a lesson in Keystatic, edits the title and one `<Quiz>` question, saves. The resulting PR's MDX diff is minimal and
  well-formed; `astro build` passes.
- **Schema sync:** a unit test asserts the Keystatic block schema for each interactive component matches the component's TypeScript prop types (fail if
  they drift).
- **Markdoc validation:** a lesson with a typo in a `{% quiz %}` tag fails `astro build` with a line number; same lesson written in MDX without the typo
  builds clean.
- **Fallback switch:** a hidden integration test swaps Keystatic out for Sveltia using the same content; the author experience is sufficient for the same
  lesson to be edited end-to-end.

## More Information

- Research §2.3 "Optional UI authoring layer: Keystatic (primary) or Sveltia CMS (fallback)".
- Keystatic: https://keystatic.com/.
- Sveltia CMS: https://github.com/sveltia/sveltia-cms.
- Markdoc: https://markdoc.dev/.
- Related ADRs: 0002 (Astro foundation), 0015 (packaging: content model feeds packager).
- Open question / revisit trigger: if Keystatic goes 12 months without a release, promote Sveltia to primary. Monitor upstream cadence.
