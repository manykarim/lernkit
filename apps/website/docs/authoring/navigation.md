---
id: navigation
title: Cross-lesson navigation
sidebar_position: 9
---

# Cross-lesson navigation

Lernkit lessons render with three navigation surfaces:

1. **Sidebar** — the left rail; configured in `astro.config.mjs`.
2. **Inline links** — Markdown links in lesson prose.
3. **Prev / next pager** — auto-generated at the bottom of each lesson.

All three play together with Astro's [`<ClientRouter />`](https://docs.astro.build/en/guides/view-transitions/)
so internal navigation is SPA-style: no full-page reload, the SCORM session
stays alive for the whole course (see [Topology](/packaging/topology)).

## Sidebar configuration

Sidebar lives in `apps/docs/astro.config.mjs`:

```js title="apps/docs/astro.config.mjs"
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Lernkit',
      sidebar: [
        {
          label: 'Robot Framework training',
          items: [
            { label: 'Course overview', slug: 'rf-training' },
            { label: 'Cheat sheet', slug: 'rf-training/cheat-sheet' },
            {
              label: 'Section 1 — Getting started',
              collapsed: false,
              items: [
                { label: 'Section 1 intro', slug: 'rf-training/section-1-getting-started' },
                { label: '1.1 Install Python', slug: 'rf-training/section-1-getting-started/1-1-install-python' },
                { label: '1.2 Virtual environments', slug: 'rf-training/section-1-getting-started/1-2-virtual-environments' },
                { label: '1.3 (Optional) uv', slug: 'rf-training/section-1-getting-started/1-3-uv' },
                { label: '1.4 Installing Robot Framework', slug: 'rf-training/section-1-getting-started/1-4-installing-rf' },
                { label: '1.5 IDE setup', slug: 'rf-training/section-1-getting-started/1-5-ide-setup' },
                { label: 'Section 1 review', slug: 'rf-training/section-1-getting-started/review' },
              ],
            },
            // …Section 2 here
          ],
        },
      ],
    }),
  ],
});
```

### Sidebar entry types

| Type | Shape | Use for |
|---|---|---|
| **Doc reference** | `{ label, slug }` | Single lesson |
| **Category** | `{ label, items, collapsed? }` | A group of lessons (a section) |
| **Auto-generate** | `{ label, autogenerate: { directory } }` | Auto-discover all lessons under a directory |
| **External link** | `{ label, link, attrs? }` | Outside the docs (e.g., GitHub, Slack) |
| **Badge** | any entry + `{ badge: { text, variant } }` | Mark "new" / "deprecated" / "beta" entries |

### Auto-generated sections

If you don't want to maintain the sidebar by hand, use `autogenerate`:

```js
{
  label: 'Section 1 — Getting started',
  autogenerate: { directory: 'rf-training/section-1-getting-started' },
}
```

Starlight scans the directory and creates one entry per `.mdx` (sorted
alphabetically — that's why the `1-1-`, `1-2-`, … prefixes matter).
Skipped: any file with `draft: true` in its frontmatter.

### Per-lesson sidebar overrides

Override the auto-generated label or order from inside the MDX:

```yaml
---
title: "1.1 — Install Python"
sidebar:
  label: "Step 1: Python"        # overrides the doc title in the sidebar
  order: 1                        # explicit ordering (within an autogenerate section)
  badge:
    text: New
    variant: success
---
```

### Collapse vs always-open

Sections default to **collapsed**. Set `collapsed: false` to render them
expanded by default:

```js
{
  label: 'Section 1 — Getting started',
  collapsed: false,
  items: [...],
}
```

For a long course with many sections, default-collapsed reduces the
sidebar's vertical footprint. For a focused course (1–2 sections), keep
them open.

## Inline links

Plain Markdown links work between lessons. Use **relative paths** (no
`.mdx` extension):

```mdx
For more on virtual environments, see the [venv setup lesson](./1-2-virtual-environments).

If you've never used `uv` before, the [optional uv lesson](../section-1-getting-started/1-3-uv) covers it.

The [Section 2 review](../section-2-fundamentals/review) is a good warm-up before this one.
```

How resolution works:

| Source link | Resolves from | Resolves to |
|---|---|---|
| `./next` | current lesson's directory | sibling page |
| `../foo` | one level up | another section |
| `/rf-training/index` | site root | absolute (avoid; breaks under custom `base`) |

:::tip Use relative links inside a course

Relative links survive every URL transformation the SCORM packager does
(see [LMS sub-path portability](/packaging/lms-portability)). Root-absolute
links (`/rf-training/...`) need rewriting.

:::

### Linking to a heading

Add a `#fragment`:

```mdx
See the [installation steps](./1-1-install-python#install-python).
```

Starlight auto-generates heading slugs (kebab-cased title). Override with
explicit IDs:

```mdx
## Install Python {#install-step}

…
```

Then link to `#install-step`.

### Linking to external sites

Plain Markdown:

```mdx
Read the [Robot Framework user guide](https://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html).
```

External links auto-render with an "external" icon (Starlight default).

## Prev / next pager

Starlight auto-generates the prev/next links at the bottom of each lesson
based on sidebar order. No configuration needed.

Override per-lesson via frontmatter:

```yaml
---
title: "1.4 — Installing Robot Framework"
prev:
  label: "Custom prev label"
  link: "/rf-training/section-1-getting-started/1-3-uv"
next: false                                 # disable next entirely
---
```

`prev: false` and `next: false` hide the corresponding link. Useful on
section landing pages or terminal lessons.

## SPA navigation: how it actually works

When the learner clicks any internal link, Astro's `<ClientRouter />`
intercepts the click:

1. **Prevent default** — no full-page reload.
2. **Fetch the new page's HTML** in the background.
3. **Swap the body** — old content out, new content in.
4. **Push the new URL** via `history.pushState`.
5. **Fire `astro:after-swap`** — your code can listen if needed.

The whole thing is one HTTP fetch + one DOM swap. The page never reloads.
For SCORM, that means `pagehide` doesn't fire on internal nav, so
`LMSFinish` doesn't run, so the SCORM session survives. See
[Topology](/packaging/topology) for the full reasoning.

### What works under SPA nav

✅ React islands rehydrate cleanly on each page.  
✅ Anchor scrolling (`#fragment`) works.  
✅ Browser back / forward work.  
✅ Stylesheets persist via the `data-astro-transition-persist` attribute
(set by the SCORM packager).

### What needs care

⚠️ **`useEffect` mount logic.** When the same component appears on two
pages, navigating between them doesn't unmount/remount — Astro persists
the React island. Use `useEffect` cleanup carefully.

⚠️ **Global state.** A counter in component state resets on each nav
(island remounts). Use `localStorage` or a global context outside the
island for persistent state.

⚠️ **Pyodide / heavy workers.** The `<RunnablePython>` and
`<RunnableRobot>` components spawn Web Workers. Workers don't auto-clean
on island unmount; the runner hooks include cleanup logic. If you build
your own worker-backed island, follow the same pattern.

## Deep linking

LMSes typically launch the SCO at the entry HTML defined in the manifest.
For Lernkit single-SCO mode, that's `<course-root>/index.html`.

Some LMSes deep-link learners back to where they left off. SCORM 1.2 has
`cmi.core.lesson_location` for this — write to it from your code, the LMS
preserves it across sessions, the SCO reads it on reinit.

The `LernkitScorm12Adapter` exposes this via `setBookmark(path)` /
`state.bookmark`. The simplest pattern:

```ts
// In a Lesson component, on mount:
const bookmark = window.LernkitScorm12?.entry();   // returns the location string
if (bookmark) router.push(bookmark);

// On nav, persist:
router.afterEach((to) => {
  window.LernkitScorm12?.setBookmark(to.fullPath);
});
```

Currently this isn't wired in `apps/docs`; it's a roadmap item for Phase 2.

## Linking *to* a course

If you have multiple courses in one repo, link between them with absolute
paths from the site root:

```mdx
Looking for Python basics first? Try the [Python intro course](/python-basics).
```

External links don't work between SCOs in different LMS courses (each is a
separate package). Cross-course nav makes sense in the dev preview but
breaks in production. Keep cross-course refs to "you might also like"
text without working links.

## Sidebar tips for long courses

- **Collapsed by default** for sections with >5 lessons.
- **Number lessons explicitly** in the label (`"1.4 Installing Robot
  Framework"` is better than `"Installing Robot Framework"`) — it
  signals progression.
- **Section "review" pages** at the end of each section give the learner
  a mental milestone.
- **Avoid more than 3 sidebar levels.** Course → Section → Lesson is
  enough. Sub-sub-sections become hard to scan.

## Where to go next

You've reached the end of the authoring section. Next:

- **[Components reference](/components/)** — the full widget catalog.
- **[SCORM 1.2 packaging](/packaging/scorm12)** — how to ship what you've
  authored.
- **[Tracking interface](/tracking/interface)** — where the data goes when
  a learner submits a quiz.
