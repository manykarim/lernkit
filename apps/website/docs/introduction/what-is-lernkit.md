---
id: what-is-lernkit
title: What is Lernkit
sidebar_position: 1
---

# What is Lernkit

Lernkit is a **code-first authoring framework for technical training**. It turns
a directory of MDX lessons (Markdown with embedded React islands) into a
standards-conformant SCORM 1.2 package that imports and runs in any LMS.

The principle: course content is source code. Author it in your editor, version
it in git, build it like any other static site, and ship it to LMSes the same
way you'd ship any other software artifact.

## What it does today

- **Astro / Starlight** as the authoring shell. You write `.mdx` files; Starlight
  renders the static site with theme + sidebar + search.
- **React islands** for interactive widgets — `<Quiz>`, `<MCQ>`, `<TrueFalse>`,
  `<RunnablePython>`, `<RunnableRobot>` — embedded directly in lessons.
- **SCORM 1.2 packager** that produces a zip importable by SCORM Cloud,
  PeopleFluent, Cornerstone, Moodle, and other LMSes — with the dozens of
  conformance gotchas already handled.
- **Robot Framework runner** powered by Pyodide. Test suites edit-and-run
  in-browser with full RF semantics; output `log.html`, `report.html`, and
  `output.xml` are exposed to the learner.
- **Pluggable Tracker** abstraction. The same lesson code emits xAPI in dev,
  SCORM `cmi.*` calls in production, or nothing in static preview, depending on
  which adapter the runtime picks.

## What's coming

Per [ADR 0015](/architecture/adrs/0015-one-source-many-outputs-build-pipeline)
("one source, many outputs"):

- **xAPI bundle** output (single-file, LRS-direct).
- **SCORM 2004 4th Edition** output (sequencing-aware).
- **cmi5** output (xAPI + assignable units, the modern path).
- **Plain HTML** output for self-hosting.

The unified `CoursePackage` input is already shared across all packagers; the
SCORM 1.2 implementation just landed first.

## What it isn't

- **Not a WYSIWYG editor.** If you want drag-and-drop authoring, look at
  Articulate Rise, EasyGenerator, or iSpring. Lernkit assumes the author is
  comfortable in MDX.
- **Not an LMS.** The output is a SCORM package; bring your own LMS.
- **Not a learning record store.** Lernkit emits xAPI / SCORM events through
  the Tracker; an LMS or LRS receives them.

## Three deliverables

A single source course produces three (or more) deliverables, depending on the
configured packagers:

```
                ┌──────────────────────────┐
                │   apps/<your-course>/    │
                │   src/content/docs/      │
                │   *.mdx                  │
                └────────────┬─────────────┘
                             │ pnpm build
                             ▼
                ┌──────────────────────────┐
                │  Astro/Starlight build   │
                │      apps/.../dist/      │
                └────────────┬─────────────┘
                             │
            ┌────────────────┼─────────────────────┐
            ▼                ▼                     ▼
   ┌────────────────┐ ┌──────────────┐  ┌──────────────────┐
   │ scorm12.zip    │ │ xapi.zip     │  │ static-html.zip  │
   │  (today)       │ │  (planned)   │  │   (planned)      │
   └────────────────┘ └──────────────┘  └──────────────────┘
```

## Where to go next

- New to Lernkit? **→ [Quickstart](/introduction/quickstart)**.
- Already have a course concept? **→ [Concepts](/introduction/concepts)** then
  jump to **[Authoring](/authoring/)**.
- Need to ship an existing course to an LMS? **→ [Packaging](/packaging/)** and
  **[LMS deployment](/lms-deployment/)**.
