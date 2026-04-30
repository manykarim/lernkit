---
id: tables-callouts-images
title: Tables, callouts, images
sidebar_position: 8
---

# Tables, callouts, images

Three categories of non-interactive visual primitives. Tables are
Markdown; callouts are Starlight `<Aside>` (and friends); images use
Markdown's `![]()` plus `<Image>` for advanced cases.

## Tables

Plain Markdown tables. No imports, no escaping.

```markdown
| Task | pip + venv | uv |
|---|---|---|
| Install Robot Framework | `pip install robotframework` | `uv add robotframework` |
| Verify installation | `robot --version` | `uv run robot --version` |
| Run a test file | `robot <file.robot>` | `uv run robot <file.robot>` |
```

Renders:

| Task | pip + venv | uv |
|---|---|---|
| Install Robot Framework | `pip install robotframework` | `uv add robotframework` |
| Verify installation | `robot --version` | `uv run robot --version` |
| Run a test file | `robot <file.robot>` | `uv run robot <file.robot>` |

### Alignment

Use `:` in the separator row:

```markdown
| Left   | Center | Right |
|:-------|:------:|------:|
| `lo`   | `ce`   | `ri`  |
| `left` | `mid`  | `right` |
```

| Left   | Center | Right |
|:-------|:------:|------:|
| `lo`   | `ce`   | `ri`  |
| `left` | `mid`  | `right` |

### Inline code, links, formatting

All Markdown inline syntax works inside cells:

```markdown
| Status | Where |
|---|---|
| **Shipping** | Phase 1 |
| *Planned* | [Phase 2 plan](/architecture/) |
| `import x` | inline code |
```

### When tables aren't enough

If you need merged cells, custom CSS, or interactive sorting, drop into
HTML:

```mdx
<table>
  <thead>
    <tr><th rowSpan={2}>Format</th><th colSpan={2}>Status</th></tr>
    <tr><th>Phase 1</th><th>Phase 2</th></tr>
  </thead>
  <tbody>
    <tr><td>SCORM 1.2</td><td>✓ shipped</td><td>—</td></tr>
    <tr><td>SCORM 2004</td><td>—</td><td>planned</td></tr>
  </tbody>
</table>
```

Note: HTML inside MDX uses JSX syntax — `rowSpan`, not `rowspan`;
`colSpan`, not `colspan`. Forget that and the build fails.

## Callouts (`<Aside>`)

Starlight's `<Aside>` component renders attention-grabbing boxes.

```mdx
import { Aside } from '@astrojs/starlight/components';

<Aside type="note">
  This is a note. Use it for context the reader should know but
  doesn't need to act on.
</Aside>

<Aside type="tip">
  This is a tip. Use it for shortcuts and best practices.
</Aside>

<Aside type="caution">
  This is a caution. Use it for things that *might* go wrong.
</Aside>

<Aside type="danger">
  This is a danger. Use it for things that *will* go wrong if ignored.
</Aside>
```

Four types: `note` (blue, default), `tip` (green), `caution` (orange),
`danger` (red).

### With a custom title

```mdx
<Aside type="caution" title="Browser-only limitation">
  This in-browser runner covers pure-Python Robot Framework libraries.
  Lessons that need `SeleniumLibrary` or `Browser` use the server-side
  rf-mcp runner.
</Aside>
```

### Real example from rf-training

```mdx
<Aside type="tip">
  When using `pip + venv`, remember to activate your virtual environment
  before running any of these commands. With `uv`, activation is handled
  automatically by `uv run`.
</Aside>
```

### When to use which type

| Type | Use for | Example |
|---|---|---|
| `note` | Background info, asides | "RF runs on Python; you install Python once, system-wide." |
| `tip` | Best practice, shortcut | "Use `uv run` to skip activation." |
| `caution` | Possible footgun | "If you forget `END`, RF will report a parse error at the next line." |
| `danger` | Don't do this | "Do not run `rm -rf .venv` without `cd`-ing first." |

Don't put more than 1–2 callouts per lesson. They lose impact when
common.

## Images

Plain Markdown:

```mdx
![Alt text](./screenshots/my-screenshot.png)
```

The path is relative to the MDX file. Place images alongside the lesson:

```
section-1-getting-started/
├── 1-1-install-python.mdx
├── 1-1-install-python-screenshot.png   ← referenced as ./1-1-install-python-screenshot.png
└── …
```

Or under a per-section assets folder:

```
section-1-getting-started/
├── _assets/
│   ├── install-screenshot.png
│   └── verify-version.png
├── 1-1-install-python.mdx              ← uses ![](_assets/install-screenshot.png)
└── …
```

### Astro `<Image>` for optimized loading

For larger images that benefit from format conversion (WebP / AVIF) and
lazy loading, use Astro's built-in `<Image>` component:

```mdx
import { Image } from 'astro:assets';
import installScreenshot from './_assets/install-screenshot.png';

<Image src={installScreenshot} alt="Python installer on macOS" loading="lazy" />
```

The `import` MUST be a static path; Astro resolves it at build time so it
can generate the optimized variants.

| Prop | Required | Notes |
|---|---|---|
| `src` | yes | Imported asset (NOT a string path) |
| `alt` | yes | Always require alt text — accessibility |
| `loading` | no | `"lazy"` (default) or `"eager"` |
| `width` / `height` | no | Override the natural size |
| `decoding` | no | `"async"` (default) or `"sync"` |
| `quality` | no | 0–100; lower for screenshots, higher for photos |

### Captions

Wrap in a `<figure>`:

```mdx
<figure>
  <Image src={installScreenshot} alt="Python installer on macOS" />
  <figcaption>The Python installer on macOS Sonoma. Click "Install for me only" if your account isn't an admin.</figcaption>
</figure>
```

### SVGs

Place `.svg` files alongside the MDX and import inline:

```mdx
import diagram from './diagram.svg?raw';

<div dangerouslySetInnerHTML={{ __html: diagram }} />
```

Or render as an image (loses interactivity but is simpler):

```mdx
![Architecture diagram](./diagram.svg)
```

### What about videos / GIFs?

GIFs work as images:

```mdx
![Demo of typing a Robot test](./demo.gif)
```

For real video, use a plain `<video>` element:

```mdx
<video controls width="100%" preload="metadata">
  <source src="./demo.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>
```

GIFs are big — a 5-second screen capture often weighs 5+ MB. Convert to
MP4 with ffmpeg if size matters:

```bash
ffmpeg -i demo.gif -movflags faststart -pix_fmt yuv420p \
       -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" demo.mp4
```

## Tabs

Multi-tab content (per-OS instructions, before/after, etc.) uses
Starlight's `<Tabs>`:

`````mdx
import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs syncKey="os">
  <TabItem label="macOS / Linux">
    ```bash
    source .venv/bin/activate
    ```
  </TabItem>

  <TabItem label="Windows (PowerShell)">
    ```powershell
    .venv\Scripts\Activate.ps1
    ```
  </TabItem>
</Tabs>
`````

The `syncKey` prop ties multiple tab groups together — pick *macOS /
Linux* in one group, every other group with `syncKey="os"` on the same
page (or even across pages, persisted via `localStorage`) flips too.

## Cards and grids

For "next-step" landing pages, Starlight's `<Card>` and `<CardGrid>`:

```mdx
import { Card, CardGrid } from '@astrojs/starlight/components';

<CardGrid>
  <Card title="Install Python" icon="setting">
    Get Python and pip running on your OS.
  </Card>
  <Card title="Set up a venv" icon="document">
    Isolate this project from your system.
  </Card>
  <Card title="Install RF" icon="rocket">
    `pip install robotframework`. Verify with `robot --version`.
  </Card>
</CardGrid>
```

Three cards in a 3-up grid (responsive). Icons come from
[Starlight's built-in set](https://starlight.astro.build/reference/icons/).

## Steps

For numbered procedures with rich content per step:

`````mdx
import { Steps } from '@astrojs/starlight/components';

<Steps>

1. **Create a project folder.**

   ```bash
   mkdir my-rf-project
   cd my-rf-project
   ```

2. **Make the venv.**

   ```bash
   python -m venv .venv
   ```

3. **Activate it.**

   <Tabs syncKey="os">
     <TabItem label="macOS / Linux">
       ```bash
       source .venv/bin/activate
       ```
     </TabItem>
     <TabItem label="Windows (PowerShell)">
       ```powershell
       .venv\Scripts\Activate.ps1
       ```
     </TabItem>
   </Tabs>

</Steps>
`````

`<Steps>` renders the numbers as a vertical track on the left, with each
step's content to the right. Heavier than a plain `1. 2. 3.` list but
better for procedures with code blocks or callouts inside each step.

## Where to go next

- **[Code blocks](/authoring/code-blocks)** — fenced blocks, line markers,
  frames.
- **[Cross-lesson navigation](/authoring/navigation)** — sidebar config,
  prev/next, links between lessons.
