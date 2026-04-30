---
id: mdx
title: Writing lessons in MDX
sidebar_position: 3
---

# Writing lessons in MDX

[MDX](https://mdxjs.com/) is Markdown with JSX. You write the prose in
plain Markdown — headings, lists, links, code blocks — and drop in React /
Astro components inline whenever you want something interactive.

## A complete lesson

Every lesson follows the same shape. Here's a working example:

````mdx title="rf-training/section-1-getting-started/1-2-virtual-environments.mdx"
---
title: "1.2 — Virtual environments"
description: Why every Python project should have its own virtual environment, and how to make one.
objectives:
  - Create a venv for a project
  - Activate and deactivate it on macOS / Linux / Windows
  - Install Robot Framework into the venv and verify it
estimatedMinutes: 10
---

import { Aside, Tabs, TabItem } from '@astrojs/starlight/components';

A **virtual environment** (or *venv*) is an isolated Python installation that
lives inside your project folder. It keeps the packages you install for one
project from interfering with any other project — or with your system
Python. This is considered a best practice for every Python project, and
it's essential for Robot Framework projects where you'll often install many
libraries.

## Create a project folder and venv

```bash
mkdir my-rf-project
cd my-rf-project
python -m venv .venv
```

## Activate the venv

<Tabs syncKey="os">
  <TabItem label="Windows (PowerShell)">
    ```powershell
    .venv\Scripts\Activate.ps1
    ```
  </TabItem>

  <TabItem label="macOS / Linux">
    ```bash
    source .venv/bin/activate
    ```
  </TabItem>
</Tabs>

<Aside type="tip">
  To deactivate the venv later, just type `deactivate`. To use the venv
  again next time, simply re-run the activation command from your project
  folder.
</Aside>

## Checklist

- A `.venv` folder exists inside your project folder
- Your shell prompt shows `(.venv)`
- `which python` (or `where python`) points into `.venv/`
````

That's a real lesson. Let's break down each part.

## Frontmatter

```yaml
---
title: "1.2 — Virtual environments"
description: Why every Python project should have its own virtual environment, and how to make one.
objectives:
  - Create a venv for a project
  - Activate and deactivate it on macOS / Linux / Windows
  - Install Robot Framework into the venv and verify it
estimatedMinutes: 10
---
```

YAML at the top of the file. Starlight reads it for layout decisions; the
SCORM packager reads it for `<title>` and `<description>` of the
manifest's lesson item.

| Field | Notes |
|---|---|
| `title` | Quoted if it contains punctuation (e.g., the em dash). Becomes the `<h1>` and the sidebar label. |
| `description` | Plain string, ~140 chars sweet spot. Used in `<meta>` tags and SCORM manifest. |
| `objectives` | YAML list. Starlight renders it as a "Learning objectives" box. |
| `estimatedMinutes` | Number. Shown in the page header; used by some LMS implementations to plan learner time. |

See [Course structure](/authoring/course-structure) for the full list.

## Imports

```mdx
import { Aside, Tabs, TabItem } from '@astrojs/starlight/components';
import RunnableRobot from '@/components/rf/RunnableRobot.tsx';
import { MCQ, Quiz, TrueFalse } from '@lernkit/components';
```

ESM imports. Three sources matter:

| Import path | What's there |
|---|---|
| `@astrojs/starlight/components` | `<Aside>`, `<Tabs>`, `<TabItem>`, `<Card>`, `<CardGrid>`, `<LinkButton>`, `<Steps>`, `<Code>`, `<FileTree>`, `<Icon>` |
| `@lernkit/components` | `<Quiz>`, `<MCQ>`, `<TrueFalse>` |
| `@/components/...` | Your own React components — `RunnableRobot`, `RunnablePython`, custom widgets |

The `@/` alias points at `apps/docs/src/`. It's wired in `tsconfig.json`
and `astro.config.mjs`.

:::tip Only import what you use

MDX bundles every imported component into the page bundle whether you use
it or not. Importing `<RunnableRobot>` adds ~340 KB of compressed JS.
Don't import it on a lesson that doesn't actually run code.

:::

## Markdown features

All of CommonMark works:

```mdx
## Heading 2

Plain prose with **bold**, *italic*, `inline code`, and [a link](https://example.com).

- Bulleted list
- Of things
  - Indented sub-item

1. Ordered list
2. Of steps

> Block quote

| Header | Header |
|---|---|
| Cell  | Cell  |

---

A horizontal rule above.
```

Plus GitHub-flavored Markdown extras (tables, task lists, strikethrough).

For everything beyond plain prose, see:

- [**Code blocks**](/authoring/code-blocks) — fenced blocks, language hints, frames, line markers.
- [**Tables, callouts, images**](/authoring/tables-callouts-images) — `<Aside>`, `<Tabs>`, image conventions.

## Mixing prose and components

MDX lets you interleave prose and JSX freely. There's exactly one rule:
**components must be on their own line**, with a blank line above and
below.

✅ Good:

```mdx
Run the suite locally first, then try it in-browser:

<RunnableRobot
  client:visible
  fileName="hello.robot"
  initialCode={`*** Test Cases ***
Say Hello
    Log    Hello, Robot Framework!
`}
/>

Once the run completes, click *Show log.html* to inspect the trace.
```

❌ Bad — component inline with prose:

```mdx
Try it in-browser <RunnableRobot client:visible … />.
```

The MDX parser interprets `<RunnableRobot…/>` mid-line as JSX inside the
paragraph and the result is brittle.

## Hydration directives

React islands need a hydration directive so Astro knows when to mount them
on the client. Use `client:visible` for almost everything:

```mdx
<RunnableRobot client:visible … />
<MCQ client:visible … />
```

| Directive | When the island hydrates | Use for |
|---|---|---|
| `client:visible` | Element scrolls into view (IntersectionObserver) | Default — anything below the fold |
| `client:idle` | Browser is idle (`requestIdleCallback`) | Above-the-fold widgets that aren't interactive immediately |
| `client:load` | DOM ready | Things that must boot before the user can scroll, e.g., a global header search |
| `client:only="react"` | Mounts on the client only — no SSR HTML rendered | Components that depend on browser-only APIs and would crash during SSR |
| `client:media="(min-width: 768px)"` | Only when a media query matches | Desktop-only widgets |

:::warning Avoid `client:load` and `client:only` for SCORM-packaged courses

`client:load` and `client:only` invoke component code synchronously during
DOM-swap, which trips the
[Astro ClientRouter cross-depth race](/packaging/lms-portability) on some
LMSes. Stick to `client:visible` / `client:idle` / `client:media` for any
island that's reachable via SPA navigation.

:::

## Escaping curly braces

Curly braces in MDX are JSX expressions:

```mdx
The variable is {variableName}.   ← MDX treats {variableName} as a JS expression
```

To render literal `{` or `}`, escape them:

```mdx
The literal braces are \{ and \}.
```

Or wrap the whole thing in backticks:

```mdx
The literal braces are `{` and `}`.
```

This trips up authors most often when showing template literals, dict
literals in Python, or JSX-looking code outside fenced blocks. Use
backticks or fenced blocks to keep MDX out of it.

## File extensions: `.mdx` vs `.md`

Lernkit's docs site uses `.mdx` everywhere. Starlight also accepts `.md`,
which gets the same parser but skips JSX support. Practical rule:

- **`.mdx`** if you import any component (almost always).
- **`.md`** for pure prose — slightly faster build, no risk of MDX
  ambiguities (`<150ms` parses cleanly).

:::tip If you only need callouts and tabs

Those still require `.mdx` because they're imported components. Pure
Markdown means *no* components.

:::

## Hot reload

`pnpm --filter=@lernkit/docs dev` watches the content tree. Edits to MDX
reload instantly. Edits to components (under `src/components/`) trigger
a Vite-style fast refresh. Frontmatter changes occasionally need a manual
browser refresh.

## Where to go next

- **[Quizzes](/authoring/quizzes)** — knowledge-check primitives.
- **[Runnable Python cells](/authoring/runnable-python)** — embed
  edit-and-run Python.
- **[Runnable Robot Framework cells](/authoring/runnable-robot)** — embed
  edit-and-run RF.
- **[Code blocks](/authoring/code-blocks)** — when you just want to *show*
  code without running it.
