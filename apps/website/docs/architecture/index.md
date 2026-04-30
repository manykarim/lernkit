---
id: index
title: Architecture
sidebar_label: Overview
sidebar_position: 1
---

# Architecture

Lernkit captures non-obvious design decisions as **ADRs** (Architecture
Decision Records) using the [MADR](https://adr.github.io/madr/) format. The
records live in `docs/adr/` at the repo root and are mirrored here on every
build by a small custom Docusaurus plugin.

## Reading the ADRs

- **[All ADRs](/architecture/adrs)** — the full list with one-line summaries.
- Each ADR keeps its number; renames preserve the `ADR-NNNN` suffix in URLs.
- ADRs aren't versioned with the docs site; they describe decisions made at a
  point in time and are amended in place when superseded.

## Quick reference: structural ADRs

These are the decisions that shape *how lernkit is built*, not just what
features it has:

- **[ADR 0001](/architecture/adrs/0001-use-madr-for-architecture-decisions)** — Use MADR for ADRs.
- **[ADR 0002](/architecture/adrs/0002-adopt-astro-starlight-mdx-react-islands)** — Astro + Starlight + MDX + React islands.
- **[ADR 0003](/architecture/adrs/0003-prioritize-cmi5-and-scorm-1-2-with-2004-opt-in)** — Standards strategy: cmi5 first, SCORM 1.2 today, SCORM 2004 opt-in.
- **[ADR 0004](/architecture/adrs/0004-unified-tracker-interface-with-pluggable-adapters)** — The Tracker interface.
- **[ADR 0005](/architecture/adrs/0005-scorm-again-as-primary-lms-api-wrapper)** — scorm-again as the canonical LMS-API wrapper (legal-memo gated).
- **[ADR 0014](/architecture/adrs/0014-mit-license-for-framework-core)** — MIT license for the framework core.
- **[ADR 0015](/architecture/adrs/0015-one-source-many-outputs-build-pipeline)** — One source, many outputs: the build-pipeline shape.
- **[ADR 0022](/architecture/adrs/0022-oss-single-tenant-framework-scope)** — OSS single-tenant framework scope.

## Quick reference: feature ADRs

- **[ADR 0006](/architecture/adrs/0006-pyodide-in-web-worker-for-in-browser-python)** — Pyodide in a Web Worker for in-browser Python.
- **[ADR 0009](/architecture/adrs/0009-reuse-rf-mcp-as-robot-framework-runner-base)** — Reuse rf-mcp as the RF runner base.
- **[ADR 0010](/architecture/adrs/0010-codemirror-6-as-primary-editor)** — CodeMirror 6 as the editor.
- **[ADR 0024](/architecture/adrs/0024-pyodide-rf-for-non-browser-lessons)** — Pyodide-RF for non-browser lessons.

## Repo layout

```
lernkit/
├── apps/
│   ├── api/              # backend services (future)
│   ├── docs/             # rf-training course site (Astro/Starlight)
│   └── website/          # this site (Docusaurus)
├── packages/
│   ├── components/       # @lernkit/components — quiz widgets
│   ├── config/           # @lernkit/config — shared tsconfig
│   ├── packagers/        # @lernkit/packagers — SCORM 1.2 (today)
│   ├── runtime/          # @lernkit/runtime — browser runtime helpers
│   └── tracker/          # @lernkit/tracker — Tracker interface + adapters
├── docs/
│   ├── adr/              # architecture decisions (single source of truth)
│   ├── plan/             # phase plans, risk register, etc.
│   └── research/         # exploratory deep dives
└── …
```

## Build dependency graph

```
@lernkit/config  (tsconfig only, no build artifacts)
       ↑ extended by all
       │
@lernkit/tracker  ← @lernkit/components → @lernkit/packagers
                                                    ↑
                              apps/docs ────────────┘ (uses packageScorm12)
```

`apps/website` (this site) depends on the source TSDoc of `packagers` and
`tracker` via TypeDoc, but not on their built output.

## Where to go next

- **[All ADRs](/architecture/adrs)**.
- **[Contributing](/contributing/)** — how to propose a new ADR.
