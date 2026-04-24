# RF training conversion — issues log

Written during the end-to-end conversion of `docs/rf_training_files/section-1-getting-started.md` + `section-2-fundamentals.md` + the cheat sheet into a Lernkit-authored course, then through build + SCORM packaging. Complements the component-level review in [`GAPS.md`](./GAPS.md).

Status flags: **BLOCKER** (had to work around it or stop), **FRICTION** (doable but awkward), **POLISH** (works, would be nicer).

---

## Content authoring

1. **MDX autolink + bare-URL syntax** — FRICTION. The source `.md` uses `[text](https://…)` links which copy over cleanly, but bare URLs like `<https://example.com>` are parsed as JSX tags in MDX and break the build. Resolved by quoting URLs in backticks or converting to explicit `[text](url)` pairs. Surfaced once on the Quickstart page earlier in Phase 0; re-verified as a trap here.

2. **Emoji-prefixed callouts** (`💡 Tip:`, `⚠️ Warning:`) — POLISH. The source `.md` uses emojis inline; I converted every occurrence to Starlight's `<Aside type="tip">` / `type="caution">` / `type="note">` for consistency with the rest of the Lernkit docs. This is a judgement call, not a bug. Authors coming from plain Markdown may prefer to keep emojis; need a style guide entry (`docs/plan/` or equivalent) stating the convention.

3. **Chapter-level "next" link duplication** — FRICTION. Starlight auto-generates a next/prev pagination at page bottom if you configure it; I still ended every chapter with a manual `## Next` link for readability. Inconsistency: some themes show the Starlight pagination AND my manual link, some don't. Need to pick one or the other project-wide.

4. **`<Tabs syncKey>` ergonomics** — POLISH. Starlight's `<Tabs>` supports `syncKey` to remember a user's choice across pages (e.g. always show PowerShell across a five-chapter tutorial). Works well. Documentation gap: Lernkit README doesn't call this out — authors will rediscover it.

5. **Shiki `robot` grammar** — FRICTION (near-BLOCKER). Shiki (Starlight's highlighter) does NOT ship a `robot` grammar by default in 2026. My `.robot` code fences render as a single colour (plain text). I accepted this for the slice; production-ready content needs a Shiki `robot` grammar registered via `expressiveCode.shiki.langs` in `astro.config.mjs`. Flagged in `GAPS.md` as P0.

6. **Unicode in MDX JSX attributes** — BLOCKER (worked around). MDX JSX string attributes that contain certain special characters (curly quotes, ✗, etc.) will sometimes trip the parser depending on how they're escaped. Converted runtime-generated string content to `\u2014`, `\u2019`, etc. inside component files to guarantee parseability. Underlying cause is the interaction between MDX's JSX parser and non-ASCII string escapes; worth a lint rule.

7. **`<details>` as a make-shift `<Exercise>`** — FRICTION. The RF source has a rich "Exercise 2.1 / 2.2" format with difficulty stars, time estimates, task lists, keyword hints. Today Lernkit has no `<Exercise>` component, so I rendered these as a `<details>` block with a `Task` summary. Works, but you lose: interactive completion tracking, per-exercise xAPI emit, star rating UI. Filed in `GAPS.md`.

8. **Flipcards as plain tables** — FRICTION. Same story. 20+ flipcards per section rendered as a side-by-side Markdown table. Users can't test recall without an interactive flip. Filed in `GAPS.md` (`<Flipcards>` / `<Flashdeck>` component P1).

9. **Interactive checklists** — FRICTION. Source uses `- ☐ …` bullets the learner is meant to self-tick. Today the MDX renders the ballot-box character as a literal glyph — not a checkbox the user can click. In a SCORM context, a real `<Checklist>` could double as a progress signal via xAPI `progressed`. Filed in `GAPS.md`.

## Build pipeline

10. **`content.config.ts` frontmatter schema is too narrow** — POLISH. The current schema extends Starlight's base with just `objectives: string[]` and `estimatedMinutes: number`. The RF course needs more: section number, chapter number, prerequisites, `masteryScore`, exercise difficulty, `flipcards: Array<{front, back}>`. Solvable by extending the Zod schema; low-risk change. Worth doing before the next course.

11. **Starlight 0.30 nested sidebar ordering** — WORKED. 4-level nesting (course → section → chapter) rendered correctly out of the box. No complaint.

12. **`astro check` clean — types OK** — WORKED. No TS type friction from the newly-added React islands (`Section1ReviewQuiz.tsx`, `Section2ReviewQuiz.tsx`) once I used `ReactElement` instead of the removed React 19 `JSX.Element`.

## SCORM packager

13. **Existing packager was single-course** — BLOCKER (fixed in-session). The original `apps/docs/scripts/package-scorm12.mjs` hard-coded the root dir (`dist/course/`) and the course metadata. I extended it with env-var overrides (`COURSE_ROOT_DIR`, `COURSE_ID`, `COURSE_TITLE`, etc.) so a single repo can package multiple courses from one Astro build. Added `package:scorm12:rf-training` script alongside the existing `package:scorm12`. Flagged in `GAPS.md`; now closed.

14. **Nested lesson discovery** — BLOCKER (fixed in-session). The original script scanned `dist/course/*/index.html` only one level deep. RF training is nested (`rf-training/section-X/chapter-Y/index.html`). Rewrote discovery to walk the tree recursively and derive stable lesson IDs from the relative path (`section-1-getting-started__1-1-install-python`).

15. **Conservative asset inclusion** — POLISH. The packager bundles **every** file in `dist/_astro/` into **every** SCO. That's ~400 KB of shared assets duplicated in each SCO's `<file>` listing (though zip dedupes on the wire). For a 17-lesson course this is fine; for a 100-lesson course we want Astro's build manifest to trim per-lesson asset lists. Known P1 follow-up.

16. **Lesson titles include Starlight's site-title suffix** — POLISH. Each lesson title in the manifest reads `<lesson title> | Lernkit` because the `<title>` extractor pulls the full HTML `<title>` tag, which Starlight builds by concatenating. Acceptable for now; the next iteration should strip the trailing ` | <site-title>` when present.

17. **First lesson title extraction** — POLISH. The course overview page's title came out as just `Lernkit` — my title extractor fell through to a page whose `<title>` tag isn't where I expect (probably a sub-asset or a Starlight chrome page). Not a correctness issue, just imprecise.

18. **Runtime JS included in every SCO listing** — CORRECT but POLISH. The `lernkit-runtime/scorm12.js` ships at the zip root and each SCO lists it as a `<file>`. SCORM-correct; just noisy in the manifest. A future packager slice could keep the runtime outside the SCO's file list (it's discoverable by relative path) but the spec doesn't require either way.

## Runtime / Tracker

19. **Prose-only chapters emit zero xAPI statements** — FRICTION. The Ch 1.1–1.3 prose pages have no interactive widget, so `XapiStubAdapter` never initialises. An LMS would therefore see no `launched` / `initialized` / `progressed` / `terminated` traffic from those pages — only from the review pages. Fix: lesson-lifecycle hook emitted on page view. Filed in `GAPS.md`.

20. **`<RunnablePython>` is unusable for RF content** — EXPECTED. Python cells run, but `.robot` files are not Python. The RF content therefore uses static Shiki-highlighted code fences only. Runnable RF lands with rf-mcp integration in Phase 3 (ADR 0009). No action this session.

21. **xAPI actor identity is always `anonymous`** — POLISH. The stub adapter hard-codes an anonymous actor. In a real SCORM launch the LMS provides `cmi.core.student_id` / `cmi.core.student_name`; our adapter doesn't yet read them. Phase 3 work.

## Docs + sidebar

22. **No course-aware sidebar toggle** — POLISH. Starlight renders all sidebar groups at once; for a site with multiple courses this gets long. Eventually Lernkit will want per-course sidebar rendering (or a course-switcher header). Not a blocker for one or two courses.

23. **No progress indicator across chapters** — FRICTION. A learner on "2.3 Variables" has no visual indicator showing "6/17 chapters done." Starlight shows sidebar highlight for the current page only. The conformance plan (`docs/plan/02-phase-plan.md`) treats progress dashboard as a Phase-4 deliverable; surfacing it here so authors can see the impact.

## Counts

- MDX files authored this session: **17** (1 course overview, 1 cheat-sheet, 2 section intros, 10 chapters, 1 exercises page, 2 review pages).
- React islands authored: **2** (`Section1ReviewQuiz.tsx`, `Section2ReviewQuiz.tsx`).
- Lines of authored MDX + TSX: ~1,100.
- Issues / gaps surfaced: **23** (this file) + the structural review in `GAPS.md`.
- SCORM zips produced: **2** (sample + rf-training, both structurally valid).
- Build status at end: **green** across lint, typecheck, test (75 tests), build, packager, Python pytest (3).

## Bottom line

The tool chain works end-to-end. The gaps are all in the authoring surface (missing widgets: flipcards, exercises, interactive checklists, lesson-lifecycle tracker hooks) and in the `robot` Shiki grammar. Nothing in the pipeline itself blocks authoring a multi-section course — the packager refactor was the only real structural change needed. Time from "git clone + empty rf-training dir" to "valid SCORM zip with 17 lessons": about 90 minutes.
