---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0001 — Use MADR 3.0 for architecture decisions

## Context and Problem Statement

This project is a greenfield, opinionated authoring framework for technical training with runnable code as a first-class primitive. The research document
(`docs/research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md`) already commits to a specific stack (Astro + Starlight + MDX +
React islands + FastAPI/Postgres/Redis + gVisor sandbox + rf-mcp + Yet Analytics SQL LRS + Paged.js PDF). Those decisions need to be captured durably so that
future engineers can reconstruct the reasoning, distinguish decisions from implementation details, and know what evidence would justify revisiting a choice.

We need a lightweight, repo-local, review-friendly format for architecture decisions that does not require any external tool. We also need a consistent
status lifecycle so deprecated decisions are visible but not deleted.

## Decision Drivers

- Decisions should live next to the code, be diffable, and flow through pull requests.
- Each decision must stand on its own — one decision per file — so supersession is cheap and traceable.
- Format must be familiar to new engineers without onboarding overhead.
- Must be tool-free (plain Markdown), renderable on GitHub, and machine-parseable via YAML frontmatter.
- Must separate "what we decided" from "what we considered" from "what we gave up".

## Considered Options

- **MADR 3.0** (Markdown Any Decision Records, https://adr.github.io/madr/) with YAML frontmatter.
- **Nygard-style ADRs** (the original 2011 format: Context / Decision / Status / Consequences).
- **Y-statements** (single-sentence "In the context of X, facing Y, we decided Z to achieve W, accepting that V").
- **No ADRs; document decisions in a single `DECISIONS.md` log.**
- **ADRs stored in a wiki or external tool (Confluence, Notion).**

## Decision Outcome

Chosen option: **MADR 3.0**, because it captures context, decision drivers, alternatives with pros and cons, and consequences in a standardized template that
still reads as prose. YAML frontmatter makes status queryable by scripts and tooling. Nygard is too minimal for decisions whose value is preserving *rejected
alternatives* (e.g. why not Docusaurus, why not WebContainers). Y-statements compress too far. A monolithic `DECISIONS.md` fragments git history and invites
merge conflicts. External wikis drift from the code.

ADRs live at `docs/adr/NNNN-kebab-title.md`, numbered from `0001`, four-digit zero-padded, present-tense imperative titles.

### Consequences

- **Clarity, good:** every accepted decision has one home, a stable URL, and a diff history. New engineers can read `docs/adr/` top-to-bottom and reconstruct
  the architecture without archaeology.
- **Testability, good:** YAML frontmatter (`status`, `date`, `deciders`) enables simple scripts to list deprecated ADRs, stale dates, or missing fields.
- **Clarity, bad:** ADRs add a process step. Authors will sometimes skip writing one for "obvious" decisions — tooling and code review must enforce the habit.
- **Portability, good:** pure Markdown renders identically on GitHub, in Starlight, and in any static site generator.

## Pros and Cons of the Options

### MADR 3.0

- Good: explicit "Decision Drivers", "Considered Options", "Pros and Cons of the Options", "Validation", and "More Information" sections. Forces alternatives
  analysis.
- Good: YAML frontmatter with `status` field supports a clear lifecycle.
- Good: large community, schema maintained at adr.github.io.
- Bad: template is more verbose than Nygard; small decisions feel heavyweight.

### Nygard-style

- Good: only four sections (Title / Status / Context / Decision / Consequences) — zero friction.
- Bad: no formal slot for rejected alternatives, which is exactly where this project's value lives (research evaluated ~11 authoring tools, ~6 foundation
  frameworks, ~6 sandboxes).
- Bad: no frontmatter, so status can't be queried without parsing prose.

### Y-statements

- Good: maximally terse.
- Bad: insufficient for decisions that rest on numeric evidence (bundle sizes, 4096-char suspend\_data limits, 3–10× Pyodide slowdown).

### Single DECISIONS.md log

- Good: one file, easy to skim.
- Bad: every decision change touches the same file — merge conflicts scale with team size.
- Bad: supersession is fuzzy; cannot link to a specific past decision cleanly.

### External wiki

- Bad: drifts from the code. Access control and search live outside the repo. PR review can't touch the record.

## Status Lifecycle

ADRs move through these states, recorded in the frontmatter `status` field:

- `proposed` — drafted, open for discussion, not yet merged as policy.
- `accepted` — merged; current policy. This is the default for all ADRs written at project bootstrap.
- `deprecated` — no longer followed but no explicit replacement. Keep the file for history.
- `superseded` — explicitly replaced by another ADR. The frontmatter gains `superseded_by: NNNN-...` and the new ADR names it in its own "More Information"
  section as `supersedes: NNNN-...`.

Never delete an ADR; supersede it. The `NNNN` number is assigned at creation and never reused.

## Rules

- One decision per ADR. If a draft grows a second decision, split it.
- Titles are imperative (e.g. "Use X for Y", "Adopt X", "Defer X").
- A proposed change to an accepted ADR is made by writing a new ADR that supersedes it — not by editing the old file's body.
- Minor edits (typos, added references, clarifying prose) are allowed on accepted ADRs and should note the edit in the commit message.
- Frontmatter fields: `status`, `date` (ISO-8601), `deciders`, `consulted`, `informed`, and (when applicable) `supersedes` / `superseded_by`.

## Validation

- A CI check lints every `docs/adr/*.md` file: requires frontmatter with `status ∈ {proposed, accepted, deprecated, superseded}`, `date` in ISO-8601, and a
  `# NNNN — Title` H1 that matches the filename.
- The `docs/adr/README.md` index is regenerated (or lint-checked) on every PR that touches `docs/adr/`.
- PR template includes a checkbox: "Does this change require a new or superseding ADR?"

## More Information

- MADR spec: https://adr.github.io/madr/
- Michael Nygard's original post: "Documenting Architecture Decisions" (2011).
- This project's ADRs are written in the context of the research document cited in the index README.
- Open questions that could reverse this decision: if the team adopts a dedicated ADR tool (e.g. Log4brains, adr-tools) we may change *tooling* but the MADR
  template itself should remain stable.
