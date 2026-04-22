# Authoring — Context Model

## Purpose

Accept MDX + frontmatter + content collections as the source of truth for all training content and validate them against Zod schemas at build time. Emit a lossless unified JSON manifest that every downstream context ([Packaging](./packaging.md), [Content Rendering](./content-rendering.md), [PDF Rendering](./pdf-rendering.md)) consumes (Research §2, §6). This is the context authors "live in"; everything else is machinery triggered by their edits.

## Aggregates

- **Course** — the root of the authored tree. Identified by a stable UUID + semver-compatible `version`. Invariant: the pair `(id, version)` is globally unique; changing `id` fragments xAPI history (Research §3.2).
- **Module** — ordered child of Course; owns its child Lessons.
- **Lesson** — authored as one MDX file. Root of Lesson-internal aggregates (Challenge, Scenario, QuestionBank defined inside the file).
- **Challenge** — root of a test-graded code exercise, distinct from its embedding Lesson because it has its own assessment-visible lifecycle.
- **Scenario** — root of a branching-decision tree.
- **QuestionBank** — root of a random-draw question pool scoped to a course.
- **Glossary** — per-course term dictionary.
- **ContentCollection** — the Astro collection type grouping Courses under one schema.

## Entities

- _Lesson_ (the MDX file — has id, title, path)
- _Section_ (named `<Section>` inside a Lesson)
- _Component_ (registered React island — has component-name identity and version)
- _Decision_ (inside a Scenario)
- _Branch_ (inside a Decision)

## Value objects

- *Frontmatter* — the validated lesson/course metadata header
- *Objective*, *MasteryCriterion*, *Prerequisite*
- *Block* (Callout / Accordion-item body / Tab-item body)
- *Slot*
- *Admonition* and *Callout* variant tags
- *Variable*, *Trigger*
- *TestCase*, *HiddenTest*, *Hint* (authored challenge metadata; execution-side twins live in Code Execution)

## Domain events

- `LessonDrafted` — a new Lesson MDX file appears in the collection.
- `LessonValidated` — schema check passed at build time.
- `LessonPublished` — a Lesson is in the `dist/` output of a successful build.
- `CourseVersionBumped` — `version` in Course frontmatter advanced (propagates into [Tracking](./tracking.md) Activity IRI versioning).
- `ChallengeAuthored` — a new `<CodeChallenge>` with starter + hidden tests registered.
- `ScenarioAuthored` — new branching tree validated.
- `GlossaryUpdated` — glossary term added / redefined.

## Application services / use cases

- **ValidateCourse** — runs Zod schemas over the content collection; produces `LessonValidated` or a build-time failure with actionable diagnostics.
- **BuildManifest** — walks the validated collection and emits the unified JSON manifest ([Published Language](../02-bounded-context-map.md) to Packaging).
- **ResolvePrerequisites** — cross-references objectives and emits dependency order.
- **RegisterComponent** — authoring-time check that every MDX-invoked component exists in the registry and its props conform.

## Integration with other contexts

- **Downstream — [Content Rendering](./content-rendering.md):** Shared Kernel on the Component contract set; Customer-Supplier for validated content.
- **Downstream — [Packaging](./packaging.md):** Published Language via the unified JSON manifest. The manifest schema is versioned and documented.
- **Downstream — [PDF Rendering](./pdf-rendering.md):** via the same manifest.
- **Upstream — [Authoring UI](./authoring-ui.md):** CS — Keystatic writes MDX files that Authoring then validates.
- **Upstream — [Identity & Tenancy](./identity-tenancy.md):** CS — Workspace scoping determines which ContentCollection the author is editing.

No direct integration with runtime contexts (Code Execution, Tracking). Runtime behavior is expressed *through* the authored Component tree, not by Authoring itself calling runtime APIs.

## Invariants and business rules

1. **Every Lesson MUST have a Frontmatter block and pass the Zod schema**, or the build fails.
2. **ActivityId IRIs are derived deterministically** from `(CourseId, LessonId, CourseVersion)` — never hand-written (Research §3.2).
3. **A Course has at least one Module; a Module has at least one Lesson** (empty containers are build errors).
4. **A Challenge has at least one HiddenTest OR a non-empty rubric** (otherwise it cannot be graded).
5. **A Scenario's branch graph must be acyclic** (enforced at validation).
6. **Version semantics**: bumping `Course.version` is required when any Lesson's `ActivityId` would change — and `ActivityId` is a function of `(CourseId, LessonId)`, not of content — so version bumps are reserved for restructure events that genuinely want a new xAPI history (Research §10.9).
7. **Component props are validated against TypeScript types at build**; unknown props fail the build to prevent silent typo-bugs in MDX (Research §10.8).
8. **Glossary terms are globally unique per Course** (case-insensitive comparison).
