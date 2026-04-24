# RF Training Conversion — Gap Review

> Scope: what's missing or awkward when porting `section-1-getting-started.md`,
> `section-2-fundamentals.md`, `robot-framework-cheat-sheet.md`, and
> `section_1_2_snippets.robot` into Lernkit MDX lessons with today's component
> set. ~15-minute review against Phase 1 authoring surface.

## 1. Training content shape

The RF training files mix **narrative prose** (chapter intros, learning
objectives), **fenced code blocks** (Bash, PowerShell, JSON, and `robot` — the
latter is the dominant language), **inline emoji callouts** (`💡` tips, `⚠️`
warnings, `✅` / `❌` correct-vs-wrong pairs), **comparison tables** (3-col
pip-vs-uv, type-name tables, keyboard-shortcut matrices, section-structure
tables), **OS-specific alternative blocks** (Windows / macOS / Linux install
recipes rendered as sequential H3s rather than tabs), **per-chapter checklists**
(`- ☐ ...` bullets used as self-assessment), **terminal-output fences** (the
expected `robot ...` output), **flipcard tables** (Section-level "Front | Back"
two-column review at the end of each chapter), **hands-on exercises** (named
`Exercise 2.1 ★☆☆ (~5 min)` with task list + "Keywords to use" hints), a
**standalone cheat-sheet page**, and **cross-chapter links** ("skip to Chapter
1.4"). No images, no diagrams, no videos in the source — but a real course
would add them. The companion `.robot` file is the executable ground truth for
every snippet in the prose.

## 2. Per-kind gap assessment

### 1. Runnable Robot Framework snippets
- **RF source:** 30+ `*** Test Cases ***` blocks with 4-space indentation and the two-space separator. Source-of-truth lives in `section_1_2_snippets.robot`; prose files embed the same snippets as non-runnable code fences.
- **Lernkit today:** `RunnablePython` (Pyodide, Web Worker). Nothing for `.robot`. Static code renders via Shiki; Starlight's default Shiki build does **not** include a `robot` grammar (`shiki` bundles common langs — RF is not in the curated set). Phase-3 `<RunnableRF>` is planned against rf-mcp but not shipped.
- **Gap:** Cannot execute RF in-browser. Worse: without registering `robotframework` as a custom Shiki lang, ```` ```robot ```` fences either render unstyled or throw at build time in strict Shiki mode.
- **Remedy:** Ship as **syntax-highlighted static fences** now; register `robot` / `robotframework` as a Shiki custom lang in `astro.config.mjs` (Starlight exposes `markdown.shikiConfig.langs`). Link each snippet to the tagged test case in `section_1_2_snippets.robot` ("run locally with `robot -t '<name>' section_1_2_snippets.robot`"). Defer interactive execution to Phase 3.

### 2. Multi-snippet comparison tables
- **RF source:** 3-col "Task | pip+venv | uv" in Ch 1.4 and the cheat sheet; keyword-vs-meaning tables; type tables.
- **Lernkit today:** plain MDX tables render fine; no bespoke component.
- **Gap:** None functionally. Slight cosmetic gap — long command strings wrap awkwardly on narrow viewports.
- **Remedy:** Ship as plain MDX tables. Accept.

### 3. Tabbed alternatives (OS install)
- **RF source:** sequential H3s (`▸ Install Python on Windows`, `▸ Install Python on macOS`, `▸ Install Python on Linux`). Natural fit for tabs.
- **Lernkit today:** Starlight ships `<Tabs>` + `<TabItem>` via `@astrojs/starlight/components` (zero extra deps). Meshes fine with React islands — quizzes and `RunnablePython` work inside a `<TabItem>`.
- **Gap:** None. We just haven't used them yet in the sample course.
- **Remedy:** Use `<Tabs>` for the OS matrix and for pip-vs-uv command pairs. Reuse existing Starlight primitives.

### 4. Callouts
- **RF source:** emoji-prefixed paragraphs: `💡` (tip), `⚠️` (caution), `✅ Correct` / `❌ Wrong`.
- **Lernkit today:** Starlight `<Aside type="tip|note|caution|danger">`. No "correct-vs-wrong paired example" primitive.
- **Gap:** `<Aside>` covers 💡 and ⚠️ cleanly. The `✅`/`❌` pattern (two code blocks, one labelled correct, one labelled wrong) is awkward — an `<Aside type="tip">` + `<Aside type="danger">` pair reads fine but is visually heavier than the source.
- **Remedy:** Map 💡→`tip`, ⚠️→`caution`/`danger`, ✅/❌→adjacent Asides with a one-line caption. Accept the visual weight; a future `<CorrectIncorrectPair>` component is a P2 nice-to-have.

### 5. Checklist widgets
- **RF source:** `- ☐ ...` bullets labelled "Checklist" end every chapter (`Python 3.8+ installed`, `robot --version works`, …). Used as self-check — not graded, but learners expect to tick them.
- **Lernkit today:** Nothing. Quiz is graded; no "save my progress on this item" list. Not in the Phase 1 Tier 1 vocabulary I could find.
- **Gap:** **Real gap.** Either ship as un-interactive bullets (loses learner affordance) or (ab)use `<TrueFalse>` questions grouped in a `<Quiz>` (overkill — each item becomes a graded question, and there are 6+ per chapter).
- **Remedy:** P1 **new component** `<Checklist>` — plain HTML checkboxes, persisted via the Tracker's `recordInteraction` as an ungraded progress signal. Minimum-viable: no Tracker integration in v0, just local state + `localStorage` keyed by lesson id. Explicitly small.

### 6. Flipcards
- **RF source:** each section ends with a `| Front | Back |` table of 15–21 terms. It's a review/recap surface.
- **Lernkit today:** No `<Flipcard>` / `<Flashcard>` / `<Flashdeck>` component. Not in the quiz package exports.
- **Gap:** **Real gap** for the review UX. Ships as a flat two-col table (verbose, no memorisation affordance) or as a pile of `<MCQ>` questions (wrong semantic — flipcards aren't graded).
- **Remedy:** P1/P2 **new component** `<Flashdeck>` with per-card flip animation, optional spaced-repetition stub. For this conversion: ship as **plain MDX tables** with a heading "Review terms"; flag flashdeck as a Phase-1.5 follow-up. This is a recurring pattern — every section will want it.

### 7. Hands-on exercises
- **RF source:** `Exercise 2.1 — Warehouse Welcome ★☆☆ (~5 min)` with: scenario intro, numbered task list, "Keywords to use:" inline hint. Solutions live in `section_1_2_snippets.robot`.
- **Lernkit today:** No `<Exercise>` / `<Task>` container. `<CodeChallenge>` is planned for P2 and is grading-oriented (hidden tests + auto-grade). An un-graded "go do this at your terminal" exercise has no component.
- **Gap:** **Real gap.** The difficulty rating, time budget, and collapsible hints/solutions are all authoring conventions today — no schema support, no visual treatment.
- **Remedy:** P1 **new component** `<Exercise title="…" difficulty="1–3" estimatedMinutes="5">` wrapping the task list, with a `<details>` for "Keywords to use" and a second `<details>` for "Solution". Minimum-viable: CSS-styled `<Aside>` + `<details>` composition, no new React component required — document the pattern in the author guide. Upgrade to a real component when `<CodeChallenge>` lands.

### 8. Progress / mark-as-complete
- **RF source:** implicit — checklists double as "I'm done with this chapter" markers.
- **Lernkit today:** Tracker emits `complete` on quiz submit; there is no learner-facing "mark this lesson complete" UI for prose-only chapters. Chapter 1.1 has no quiz, so under SCORM the LMS never sees `completed`.
- **Gap:** **Real gap** for prose-heavy chapters. In a SCORM package, a chapter with no quiz never flips to `completed` and the learner appears stuck.
- **Remedy:** Either (a) require each chapter to end in a short knowledge-check quiz (pedagogically sound, but an authoring rule), or (b) ship a `<LessonCompleteButton>` that calls `tracker.complete()`. Recommend (a) as Phase-1 authoring guidance + add (b) to the Tier 1 vocabulary list as a one-evening component. This is the twin of gap #5.

### 9. xAPI emission for non-quiz events
- **RF source:** n/a — source-side doesn't care.
- **Lernkit today:** `Quiz` → xAPI statements on submit (`answered`, `scored`, `passed/failed`). No owner for `launched`, `progressed`, `completed`-for-prose, `experienced` on scroll-through. cmi5 verbs (`launched`, `initialized`, `terminated`) are adapter-level but not lesson-level.
- **Gap:** For a multi-chapter RF course, the LMS reporting will show quiz outcomes only — no evidence the learner read Chapter 1.1, 1.2, 1.3. Impacts conformance story (Phase 5 metric wants full bookmark/resume coverage).
- **Remedy:** Specify a `<LessonLifecycle>` wrapper (emits `launched` on mount, `terminated` on unmount) that every lesson layout renders. Tier 1 gap — add to Phase 1 vocabulary if not already on the list. No new UX, pure plumbing.

### 10. In-editor formatting / live preview
- **RF source:** authored in plain Markdown; the current pipeline is "edit `.md` or `.mdx`, run `pnpm dev`, refresh".
- **Lernkit today:** no Keystatic yet (Phase 4). Authors edit MDX files; preview via Astro dev server.
- **Gap:** Authoring velocity is fine for engineers, rough for IDs. Not a blocker for *this* conversion — the author is an engineer doing dogfood.
- **Remedy:** Accept for now. Keystatic + live preview is P4 scope.

### 11. Inline TOC / cross-references
- **RF source:** inline links like "skip to Chapter 1.4", plus end-of-section "What's next: Section 2".
- **Lernkit today:** MDX supports plain links; Starlight auto-generates a per-page TOC from headings but has no cross-page "next chapter" widget beyond the sidebar's prev/next.
- **Gap:** Minor. Starlight does ship automatic prev/next footer arrows if the sidebar order is configured. For mid-page jumps ("skip to 1.4") we're fine with plain Markdown links.
- **Remedy:** Author using plain links + rely on Starlight's built-in prev/next. Accept.

### 12. Images / diagrams
- **RF source:** none in the current files, but a real RF course needs screenshots of the VS Code Test Explorer, RobotCode extension pane, log.html output, etc. A "how keywords resolve" diagram begs for Mermaid.
- **Lernkit today:** Astro's `<Image />` (optimised) is available from `astro:assets`. Mermaid is not wired into the MDX pipeline today (it's listed in Phase 2 for PDF pre-rendering — `Mermaid pre-rendered to SVG` per `02-phase-plan.md §Phase 2`). No `remark-mermaid` plugin is currently in `astro.config.mjs`.
- **Gap:** Mermaid is not available in authoring today. Screenshots work via plain `<Image />` or Markdown `![]()`.
- **Remedy:** For screenshots ship plain `<Image />`. For flow diagrams, either (a) add `rehype-mermaid` now as a small config change or (b) defer and use SVG assets. (a) is ~20 lines of config. Add it.

### 13. Keyboard-shortcut tables
- **RF source:** Chapter 1.5 has a "Action | Windows/Linux | macOS" table.
- **Lernkit today:** plain MDX table renders fine. `<kbd>` is standard HTML, usable inline.
- **Gap:** None.
- **Remedy:** Ship as MDX table using `<kbd>` inside cells. Accept.

### 14. Cheat-sheet pattern
- **RF source:** `robot-framework-cheat-sheet.md` is standalone, short (20 lines), and duplicates Ch 1.4's recap table.
- **Lernkit today:** Starlight sidebar accepts a `Cheat sheet` group with free-standing slugs. No "pinned / always-visible" cheat-sheet widget.
- **Gap:** Minor. A course-level cheat-sheet belongs in the sidebar as its own entry; duplication with Ch 1.4 is an author choice, not a framework limitation.
- **Remedy:** Add `Cheat sheet` as a top-level sidebar item in the RF course's section of `astro.config.mjs`. Accept.

## 3. Framework-level issues surfaced by this dogfood

- **SCORM packager is single-course.** `apps/docs/scripts/package-scorm12.mjs` hard-codes `courseId: 'lernkit-sample-course'`, scans `dist/course/` as a flat lesson list (each subdir = one SCO), and emits one zip to `dist-packages/scorm12/`. For a multi-course monorepo (Python + RF + JS training side-by-side), there is no way to emit three separate zips without three scripts. Needs a `courses: CourseDescriptor[]` config or a CLI that takes `--course <id>` and a per-course `dist/<course-id>/course/` layout. P1 follow-up.
- **Content-collection schema is thin.** `apps/docs/src/content.config.ts` extends `docsSchema` with only `objectives` and `estimatedMinutes`. RF lessons need: `section: number`, `chapter: string` (e.g. `"1.4"`), `difficulty: 1|2|3`, `prerequisites: string[]`, `flipcards: Array<{front, back}>`, `exercises: Array<{id, title, difficulty, minutes}>`, and a `cheatSheetSlug` cross-ref. The `authoring.md` context model lists `Objective`, `MasteryCriterion`, `Prerequisite` as value objects but they're not in the Zod schema yet. Phase-1 Tier-1 work.
- **Sidebar scale.** Starlight sidebar is fine for 10+ chapters in one section, but cross-section "review" pages (flipcard decks, cheat sheets) need their own group label and there's no collapsible-by-default behaviour configured. No limit hit, just UX to tune.
- **Shiki `robot` grammar.** Not in Starlight's default build. Confirmed no reference to `robotframework` or a Shiki custom lang in `apps/docs/`. Adding it is a 5-line `markdown.shikiConfig.langs: [...]` patch — but required before any prose renders cleanly.
- **Runnable RF story.** Pyodide cannot run `.robot` files. The Phase-3 rf-mcp integration is the plan (see `02-phase-plan.md §Phase 3 — WS-H RF Runner`). Today's authoring story for "executable RF example" is: ship as static highlighted fence + link to the `.robot` source file in-repo + a one-liner `robot -t <name>` instruction. Mention rf-mcp in a "coming soon" callout, do not design around it.
- **Tracker lesson-lifecycle verbs.** `@lernkit/tracker` has `recordInteraction`, `setScore`, `complete`, `pass`, `fail`, `terminate` — but there's no documented `launched` / `progressed` hook for lesson-open / scroll-completion. Every prose-only RF chapter is invisible to the LRS today.

## 4. Prioritised remediation

| Rank | Gap | Priority | Why |
|---|---|---|---|
| 1 | Shiki `robot` grammar registration | **P0** | Without it, `\`\`\`robot` fences don't highlight; every prose chapter looks broken. ~5 lines of config. |
| 2 | Multi-course SCORM packager (or per-course config) | **P0** | Can't ship RF course alongside sample course without it; blocks any multi-course monorepo. |
| 3 | Lesson lifecycle verbs (`launched`/`terminated`) | **P0** | Without this, prose-only chapters never report to SCORM/xAPI → learners appear stuck in LMS. |
| 4 | Content schema fields for RF (section, chapter, difficulty, prerequisites) | **P1** | Authorable via unused `extra` fields today, but schema enforcement is absent — silent typos. |
| 5 | `<Checklist>` (self-assessment bullets) | **P1** | Checklists appear in every chapter. MDX bullets with checkbox input acceptable as ugly workaround. |
| 6 | `<Exercise>` container (difficulty, minutes, hints, solution) | **P1** | Compose from `<Aside>` + `<details>` now; upgrade to component when `<CodeChallenge>` lands in P2. |
| 7 | `<Flashdeck>` / flipcards | **P1** | Every section ends with a flipcard table; current workaround is a plain MDX table — loses the affordance. |
| 8 | Mermaid in MDX | **P1** | Needed for any real diagram; one rehype-plugin config line. Phase 2 already intends it for PDF — pull forward. |
| 9 | `<LessonCompleteButton>` for prose chapters | **P2** | Only needed if we decide (a) "every chapter ends in a quiz" is not mandatory. |
| 10 | `<CorrectIncorrectPair>` for ✅/❌ code contrast | **P2** | Cosmetic; paired `<Aside>`s read fine. |
| 11 | Pinned cheat-sheet widget | **P2** | Sidebar entry is adequate. |
| 12 | Keystatic live preview | **P2** | Phase 4 — don't pull forward for a dogfood. |

## 5. Recommendation for this session's conversion

Convert the four RF files using **Starlight `<Tabs>`** for OS-specific install blocks, **`<Aside>`** for all emoji callouts, **plain MDX tables** for comparisons and flipcards (with a "Review terms" heading), **`<details>` + styled `<Aside>`** as a hand-rolled `<Exercise>` pattern (document in the author guide), and **static Shiki-highlighted `robot` fences** linking to the tagged test cases in `section_1_2_snippets.robot`. Before authoring a single `.mdx`, land the P0 trio: register the `robot` Shiki grammar in `apps/docs/astro.config.mjs`, add `section` / `chapter` / `difficulty` to the content-collection schema, and wire a `<LessonLifecycle>` island so every chapter (prose or quiz) emits `launched` + `terminated`. Defer `<Checklist>`, `<Flashdeck>`, `<Exercise>`, and `<RunnableRF>` — ship the dogfood first, then use the pain points to prioritise the next slice.
