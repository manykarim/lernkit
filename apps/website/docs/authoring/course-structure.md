---
id: course-structure
title: Course structure
sidebar_position: 2
---

# Course structure

Every Lernkit course lives under a single root directory inside the Astro
docs app. This page walks through that layout and the conventions Lernkit
expects.

## Where courses live

The reference implementation puts everything under `apps/docs/`:

```
apps/docs/
├── astro.config.mjs                       # Starlight config; sidebar lives here
├── package.json                           # `pnpm --filter=@lernkit/docs dev`
├── public/
│   ├── pyodide/                           # vendored by copy-pyodide.mjs (gitignored)
│   └── rf-libdocs/                        # vendored by download-rf-libdocs.mjs (gitignored)
├── scripts/
│   ├── copy-pyodide.mjs                   # post-install hook
│   ├── download-rf-libdocs.mjs            # post-install hook
│   ├── download-rf-wheels.mjs             # post-install hook
│   └── package-scorm12.mjs                # produces the SCORM zip
└── src/
    ├── components/                        # custom React islands (RunnableRobot, etc.)
    ├── content/
    │   └── docs/
    │       ├── index.mdx                  # site root
    │       ├── guides/                    # standalone how-to pages
    │       └── rf-training/               # ← a course
    │           ├── index.mdx              # course overview
    │           ├── cheat-sheet.mdx
    │           ├── section-1-getting-started/
    │           │   ├── index.mdx          # section landing page
    │           │   ├── 1-1-install-python.mdx
    │           │   ├── 1-2-virtual-environments.mdx
    │           │   └── …
    │           └── section-2-fundamentals/
    │               ├── index.mdx
    │               └── …
    └── styles/
        └── lernkit.css                    # author-side theme tweaks
```

The crucial bit is **`src/content/docs/<course-root>/`**. That directory is
the course; lessons under it are MDX files; sections are nested directories
with their own `index.mdx`.

## Naming conventions

- **Course root:** kebab-case (e.g., `rf-training`, `python-basics`,
  `selenium-101`). Becomes part of every URL.
- **Sections:** `section-N-<slug>` (e.g., `section-1-getting-started`,
  `section-2-fundamentals`). The `N-` prefix orders them in the sidebar
  alphabetically as a fallback when sidebar config is implicit.
- **Lessons:** `<section-N>-<m>-<slug>` (e.g., `1-1-install-python`,
  `1-2-virtual-environments`). The `<m>` is the lesson number within the
  section.
- **Course overview:** `index.mdx` at the course root.
- **Section overviews:** `index.mdx` inside each section directory.

These conventions aren't enforced by the framework, but they make the
manifest builder produce predictable lesson IDs and SCORM `<item>` ordering.

## A lesson file at a glance

```mdx title="src/content/docs/rf-training/section-1-getting-started/1-1-install-python.mdx"
---
title: "1.1 — Install Python and pip"
description: Install Python on your OS, verify the version, and check that pip works.
objectives:
  - Install Python 3.10+ from python.org or a package manager
  - Confirm `python --version` and `pip --version` succeed
estimatedMinutes: 8
---

import { Aside, Tabs, TabItem } from '@astrojs/starlight/components';

## Why we install Python first

Robot Framework runs on Python. You install Python once, system-wide
(or via a version manager), then use it as the base for every project.

…
```

Anatomy:

1. **Frontmatter (YAML)** — title, description, objectives, estimated
   minutes. Starlight uses `title` for the page heading and the sidebar
   label; `description` lands in the `<meta name="description">` tag.
2. **Imports (ESM)** — bring in any Astro / Starlight components or your
   custom React islands you'll use in the body.
3. **Markdown body** — headings, prose, lists, code blocks.
4. **Components** — `<Aside>`, `<Tabs>`, `<RunnableRobot>`, `<Quiz>`, etc.

The next page, [Writing lessons in MDX](/authoring/mdx), goes deep on each
of these.

## Required vs. optional frontmatter

| Field | Required? | What it does |
|---|---|---|
| `title` | yes | Page heading + sidebar label + `<title>` tag |
| `description` | yes | `<meta name="description">` + LMS course description |
| `objectives` | optional | Rendered as a "Learning objectives" box at the top of the page (Starlight default) |
| `estimatedMinutes` | optional | Shown in the lesson header. Useful signal for learners |
| `slug` | optional | Override the URL slug. Default = filename without `.mdx` |
| `sidebar` | optional | Custom sidebar entry (label, order, badge). See [Cross-lesson navigation](/authoring/navigation) |
| `template` | optional | Starlight layout template (`splash`, `doc`). Default `doc` |

## How sections become SCORM items

When you run `pnpm --filter=@lernkit/docs build` followed by
`package-scorm12.mjs`, the script walks the `dist/<course-root>/`
directory, finds every `index.html`, and emits one `Lesson` per file:

```ts
// from apps/docs/scripts/package-scorm12.mjs
function slugFromRelPath(relPath) {
  // 'section-1-getting-started/1-1-install-python' → 'section-1-getting-started__1-1-install-python'
  return relPath.replace(/\//g, '__').replace(/[^a-zA-Z0-9._-]+/g, '-');
}
```

The lesson `id` becomes the SCORM item identifier; the sidebar order
becomes the `<organization>` order in the manifest.

## Adding a new lesson

1. Decide which section it belongs to.
2. Create `apps/docs/src/content/docs/<course>/<section>/<N-slug>.mdx`.
3. Add frontmatter (title + description minimum).
4. Write content.
5. Add a sidebar entry in `astro.config.mjs` (or rely on auto-ordering;
   see [Cross-lesson navigation](/authoring/navigation)).
6. `pnpm --filter=@lernkit/docs dev` to preview.

That's it. The rest of the framework — runtime injection, persist
attributes, URL rewriting, manifest emission — is automatic on the next
package build.

## Adding a new course

Repeat the structure under a new course root:

```
src/content/docs/
  python-basics/                    # ← new course root
    index.mdx                       # overview
    section-1-syntax/
      index.mdx
      1-1-numbers.mdx
      …
```

Then in your packaging script (or by setting environment variables on
`package-scorm12.mjs`):

```bash
COURSE_ROOT_DIR=python-basics \
  COURSE_ID=python-basics \
  COURSE_TITLE="Python Basics" \
  COURSE_DESCRIPTION="A first course in Python" \
  COURSE_MASTERY_SCORE=0.7 \
  node apps/docs/scripts/package-scorm12.mjs
```

Multiple courses can coexist under `src/content/docs/`. They share the
build but produce separate SCORM zips.

## Where to go next

- **[Writing lessons in MDX](/authoring/mdx)** — the full MDX surface.
- **[Cross-lesson navigation](/authoring/navigation)** — wire your lesson
  into the sidebar.
