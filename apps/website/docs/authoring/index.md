---
id: index
title: Authoring — overview
sidebar_label: Overview
sidebar_position: 1
---

# Authoring

Lernkit lessons are MDX files. You write Markdown for the prose, drop in
React-island widgets for anything interactive, and Astro / Starlight handles
the build. This section is the practical reference for everything an author
needs to know.

## What's in this section

| Page | When to read |
|---|---|
| [Course structure](/authoring/course-structure) | Setting up a new course; understanding the file layout |
| [Writing lessons in MDX](/authoring/mdx) | Daily authoring — frontmatter, imports, mixing prose + components |
| [Quizzes](/authoring/quizzes) | `<Quiz>`, `<MCQ>`, `<TrueFalse>` — props, examples, grading model |
| [Runnable Python cells](/authoring/runnable-python) | `<RunnablePython>` — Pyodide-backed in-browser Python |
| [Runnable Robot Framework cells](/authoring/runnable-robot) | `<RunnableRobot>` — full RF execution in-browser |
| [Code blocks and syntax highlighting](/authoring/code-blocks) | Expressive Code, syntax-highlighted languages, frames, line markers |
| [Tables, callouts, images](/authoring/tables-callouts-images) | Starlight components for non-interactive content |
| [Cross-lesson navigation](/authoring/navigation) | Sidebar config, prev/next, deep links, the SPA router |

## A minimal authoring loop

```bash
pnpm --filter=@lernkit/docs dev
# → http://localhost:4321/rf-training/
```

Edit any `.mdx` file under `apps/docs/src/content/docs/`. Astro hot-reloads.
Once you're happy:

```bash
pnpm --filter=@lernkit/docs build
COURSE_ROOT_DIR=rf-training INCLUDE_PYODIDE_RUNTIME=1 \
  node apps/docs/scripts/package-scorm12.mjs
# → apps/docs/dist-packages/scorm12/<course>-<version>-scorm12.zip
```

Drop the zip into your LMS.

## Mental model

```
Author writes:                              Lernkit produces:
─────────────                               ────────────────
src/content/docs/                           dist/
  rf-training/                                rf-training/
    section-1/             ─── astro    ──→    section-1/
      1-1-install.mdx        build              1-1-install/
        # Heading                                 index.html
        Prose…                                    [+ assets in _astro/]
        <RunnableRobot/>                                ↓
                                            packageScorm12()
                                                        ↓
                                            dist-packages/scorm12/
                                              <course>-<v>-scorm12.zip
```

Author surface: **just the `.mdx` files**. The Astro / packager / runtime
layers don't intrude on the content tree.

## Common authoring needs (decision tree)

- **Adding a section header** → use `## Heading` (Markdown).
- **Adding emphasis or links** → use Markdown (`**bold**`, `[text](url)`).
- **Embedding a code sample (read-only)** → use a fenced code block. See
  [Code blocks](/authoring/code-blocks).
- **Embedding code the learner can edit and run (Python)** → use
  [`<RunnablePython>`](/authoring/runnable-python).
- **Embedding code the learner can edit and run (Robot Framework)** → use
  [`<RunnableRobot>`](/authoring/runnable-robot).
- **Asking a knowledge-check question** → use [`<MCQ>` or `<TrueFalse>`](/authoring/quizzes).
- **Bundling a few questions into a graded review** → use [`<Quiz>`](/authoring/quizzes).
- **Adding a tip / warning / note callout** → use Starlight's `<Aside>`.
  See [Tables, callouts, images](/authoring/tables-callouts-images).
- **Adding tabs (e.g., per-OS instructions)** → use Starlight's `<Tabs>` /
  `<TabItem>`. See [Tables, callouts, images](/authoring/tables-callouts-images).
- **Linking to another lesson** → use a relative Markdown link. See
  [Cross-lesson navigation](/authoring/navigation).

## Where to start

If you've never authored a Lernkit lesson before, read in this order:

1. **[Course structure](/authoring/course-structure)** to understand where files go.
2. **[Writing lessons in MDX](/authoring/mdx)** to write your first lesson.
3. **[Quizzes](/authoring/quizzes)** to add a knowledge check.
4. **[Cross-lesson navigation](/authoring/navigation)** to wire your lesson into the sidebar.

The other pages are reference; come back to them as needed.
