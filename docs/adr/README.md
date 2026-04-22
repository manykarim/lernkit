# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for Lernkit — a code-first authoring framework for technical training with runnable code
(Python via Pyodide, JavaScript via Sandpack, Robot Framework via rf-mcp) as a first-class primitive. Each ADR captures one decision, the alternatives we
evaluated, and the consequences we accepted.

All ADRs are grounded in the research document at
[`docs/research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md`](../research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md).
When specific facts (bundle sizes, LMS behavior, library names, license classes) matter to the reasoning, the ADR quotes them directly.

## How we use ADRs

We write ADRs in the [MADR 3.0](https://adr.github.io/madr/) format. The process is defined by [ADR 0001](./0001-use-madr-for-architecture-decisions.md) and
the essentials are:

- **One decision per ADR.** Each file captures exactly one decision. If a draft grows a second decision, split it.
- **Numbered, never reused.** Files are named `NNNN-kebab-title.md` starting at `0001`. Numbers are assigned at creation and are permanent.
- **Present-tense imperative titles.** "Use X for Y", "Adopt X", "Defer X".
- **YAML frontmatter tracks lifecycle.** Every file starts with `status`, `date`, `deciders`, `consulted`, `informed`, and (when applicable) `supersedes` /
  `superseded_by`.

### Status lifecycle

- `proposed` — drafted for discussion; not yet policy.
- `accepted` — merged; current policy. Default for ADRs written at project bootstrap.
- `deprecated` — no longer followed; no explicit replacement. File stays for history.
- `superseded` — replaced by a specific newer ADR. `superseded_by: NNNN-...` frontmatter links forward; the replacing ADR's "More Information" section names
  the ADR it supersedes.

Never delete an ADR — supersede it. Proposed changes to an accepted ADR are made by writing a new, superseding ADR, not by editing the old file's body.
Minor edits (typos, clarifying prose, added references) are allowed on accepted ADRs and noted in the commit message.

### When to write a new ADR

A change needs a new ADR if it:

- introduces, changes, or retires a technical choice that affects how the framework is built, shipped, or operated,
- accepts a trade-off with consequences (portability, security, performance, cost, or license) worth preserving for future engineers,
- or reverses a previously accepted decision.

Bug fixes, refactors, doc updates, and incremental feature work inside an already-accepted decision envelope do **not** need a new ADR.

## Index

### Process

- [0001 — Use MADR 3.0 for architecture decisions](./0001-use-madr-for-architecture-decisions.md) — MADR format, status lifecycle, one-decision-per-file rule.

### Foundation

- [0002 — Adopt Astro 5 + Starlight + MDX + React islands](./0002-adopt-astro-starlight-mdx-react-islands.md) — foundation stack, chosen for SCORM-payload
  islands architecture and Pagefind-in-SCORM static search.
- [0010 — Use CodeMirror 6 as the primary in-lesson editor](./0010-codemirror-6-as-primary-editor.md) — 120–300 KB CM6 over 2–5 MB Monaco; mobile-first;
  Monaco scoped to a dedicated IDE page only.
- [0011 — Use Paged.js + Playwright Chromium for PDF export](./0011-paged-js-playwright-for-pdf-export.md) — book-quality PDFs from the same HTML we ship to
  LMS; Playwright-alone fallback for CI previews.
- [0012 — Use Keystatic as the primary UI authoring layer](./0012-keystatic-as-primary-ui-authoring-layer.md) — Keystatic primary; Sveltia CMS fallback;
  Markdoc for author-safe content zones.
- [0014 — License the framework core under MIT](./0014-mit-license-for-framework-core.md) — MIT core mirrors H5P; optional GPL/AGPL plugins allowed;
  DCO, not CLA.
- [0016 — Embed H5P via h5p-standalone for long-tail content](./0016-embed-h5p-via-h5p-standalone-for-long-tail-content.md) — reuse ~55 H5P content types
  rather than reimplement.

### Standards and packaging

- [0003 — Prioritize cmi5 + SCORM 1.2 with SCORM 2004 4th Ed opt-in](./0003-prioritize-cmi5-and-scorm-1-2-with-2004-opt-in.md) — standards strategy; drops
  2004 2nd/3rd Ed; documents TalentLMS-1.2-only and SAP-can't-replace-1.2-with-2004 landmines.
- [0004 — Unify tracking behind a single Tracker interface with pluggable adapters](./0004-unified-tracker-interface-with-pluggable-adapters.md) — one
  TypeScript `Tracker` interface; five adapters (1.2 / 2004 / cmi5 / xAPI / noop).
- [0005 — Use scorm-again as the primary SCORM 1.2 / 2004 runtime wrapper](./0005-scorm-again-as-primary-lms-api-wrapper.md) — chosen over pipwerks /
  TinCanJS; vendoring + pinning + upstream contribution mitigate single-maintainer risk.
- [0013 — Use Yet Analytics SQL LRS as the self-hosted LRS](./0013-yet-analytics-sql-lrs-for-self-hosted-learning-record-store.md) — Apache 2.0,
  xAPI 2.0 / IEEE 9274.1.1; Learning Locker Community explicitly rejected.
- [0015 — Build one static source into many standards-packaged outputs](./0015-one-source-many-outputs-build-pipeline.md) — MDX → one Astro build → unified
  manifest → 5 packagers (scorm12 / scorm2004-4th / cmi5 / xapi-bundle / plain-html).

### Runtime and code execution

- [0006 — Run in-browser Python on Pyodide 0.29.x inside a Web Worker, self-hosted](./0006-pyodide-in-web-worker-for-in-browser-python.md) — self-hosted,
  never jsDelivr; Comlink async default; Coincident + SharedArrayBuffer on isolated pages only.
- [0007 — Use Sandpack for browser JS demos; defer WebContainers to a paid tier](./0007-sandpack-for-browser-js-demos-not-webcontainers.md) — Sandpack
  (Apache 2.0) at default tier; WebContainers only with a customer-provided StackBlitz enterprise license.
- [0008 — Execute server-side code on FastAPI + Docker with gVisor](./0008-server-side-code-execution-fastapi-docker-gvisor.md) — runsc by default;
  Firecracker as a self-host opt-in for abuse-prone deployments; exhaustive hardening checklist.
- [0009 — Reuse ghcr.io/manykarim/rf-mcp as the Robot Framework runner base](./0009-reuse-rf-mcp-as-robot-framework-runner-base.md) — batch grading + MCP
  tutorial modes; two-image split (rf-mcp / rf-mcp-vnc).
- [0019 — Scope cross-origin isolation headers (COOP/COEP) to the runner page only](./0019-scope-cross-origin-isolation-headers-to-runner-page.md) — keeps
  Pyodide sync features without breaking YouTube / Vimeo / Sandpack embeds.

### Infrastructure and deployment

- [0018 — Run the default self-hosted deployment on Coolify + Hetzner dedicated](./0018-coolify-on-hetzner-for-self-hosting-default.md) — Docker Compose dev,
  Coolify-on-Hetzner single-tenant prod, vanilla Compose + Traefik as the fallback. K8s is not on the roadmap (ADR 0022).
- [0021 — Self-host every infrastructure dependency that is practical to self-host](./0021-self-host-first-infrastructure-principle.md) — GlitchTip over
  Sentry, Mattermost over Slack, Verdaccio for npm cache, GitHub kept as an explicit exception.

### Testing

- [0017 — Test the framework itself with Robot Framework](./0017-test-framework-itself-with-robot-framework.md) — layered stack: Vitest (Node), Pytest
  (FastAPI), RF + robotframework-browser (E2E), SCORM Cloud REST API as CI conformance gate.

### Scope control

- [0020 — Defer WebContainers default, Scrim, marketplace, AI authoring, multi-tenant SaaS](./0020-defer-webcontainers-scrim-marketplace-and-ai-authoring.md)
  — explicit "not now" with concrete revisit triggers for each deferred item.
- [0022 — Scope Lernkit as an OSS single-tenant framework for producing conformant course packages](./0022-oss-single-tenant-framework-scope.md) —
  hard out-of-scope list (SaaS, marketplace, multi-tenant, billing); supersedes portions of 0020; Phase 5 success metric rewritten as conformance coverage.
- [0023 — Rename the framework from Rundown to Lernkit](./0023-rename-framework-from-rundown-to-lernkit.md) — rebrand forced by common-law findings
  (The Rundown AI class-41 senior, `elseano/rundown` OSS collision, all usable domains taken); pre-check cleared Lernkit; paid search at P0 exit now
  targets Lernkit.

## Cross-cutting quality attributes

Each ADR's "Consequences" section touches the quality attributes that decision actually moves:

- **Functionality** — what the decision enables or forecloses.
- **Usability** — author DX, learner UX.
- **Performance** — bundle size, cold-start, execution latency.
- **Security** — sandbox strength, CSP, LRS credential handling.
- **Portability** — LMS compatibility, offline, multi-device.
- **Testability** — CI hooks, conformance gates.
- **Clarity** — readability of the codebase, debuggability.

Not every ADR touches all seven — only those the decision actually moves.

## Linting and conventions

- Files are named `NNNN-kebab-title.md` with `NNNN` zero-padded to four digits.
- Frontmatter fields: `status`, `date` (ISO-8601), `deciders`, `consulted`, `informed`; plus `supersedes` / `superseded_by` when applicable.
- The H1 line reads `# NNNN — Title` (em-dash, imperative title), matching the filename.
- ADRs target ~150–350 lines. If a draft grows beyond that, it is probably two decisions — split it.
- The "More Information" section links to the research document, any upstream project pages, and related ADRs.

## Contributing

When proposing a new architecture decision:

1. Check whether an existing ADR already covers it. If so, propose a superseding ADR rather than editing the old one.
2. Start with `status: proposed` in the frontmatter.
3. Open a PR. Discussion happens in PR review.
4. On merge, change `status` to `accepted` (or `superseded` for the predecessor, if applicable).
5. Update this index with the new ADR under the appropriate group.
