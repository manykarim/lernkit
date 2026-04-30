---
id: index
title: Lernkit
slug: /
sidebar_position: 1
description: Code-first authoring framework for technical training. Conformant SCORM 1.2 today; cmi5, SCORM 2004, and xAPI bundle planned.
---

# Lernkit

**Lernkit** is a code-first authoring framework for technical training. You write
lessons as MDX (Markdown + React islands), drop in interactive widgets like
quizzes and live code cells, and the framework produces standards-conformant
SCORM packages that import into any LMS.

## Quick links

- 🏃 **[Quickstart](/introduction/quickstart)** — build a course in 5 minutes.
- 📦 **[SCORM 1.2 packaging](/packaging/scorm12)** — the format that ships today.
- 📊 **[Tracking](/tracking/interface)** — the `Tracker` interface and adapters.
- 🤖 **[Robot Framework runner](/robot-framework/runnable-robot)** — in-browser RF execution via Pyodide.
- 🛡️ **[Architecture decisions](/architecture/adrs)** — every non-obvious choice, recorded as an ADR.

## Where to start

Different audiences want different entry points:

- **Course authors** → [Authoring](/authoring/) and [Components](/components/).
- **LMS integrators** → [Packaging](/packaging/) and [LMS deployment](/lms-deployment/).
- **Adapter / packager developers** → [Tracking interface](/tracking/interface) and the [API reference](/api/packagers).
- **Lernkit contributors** → [Contributing guide](/contributing/) and [Architecture](/architecture/).

## Project status

Phase 1 has shipped: a SCORM 1.2 packager that produces zips that import and run
correctly in SCORM Cloud and PeopleFluent. cmi5, SCORM 2004 4th Edition, and an
xAPI bundle output are planned per [ADR 0003](/architecture/adrs/0003-prioritize-cmi5-and-scorm-1-2-with-2004-opt-in)
and [ADR 0015](/architecture/adrs/0015-one-source-many-outputs-build-pipeline).

## License

[MIT](https://github.com/manykarim/lernkit/blob/main/LICENSE).
