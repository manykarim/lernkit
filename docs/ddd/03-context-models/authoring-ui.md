# Authoring UI — Context Model

## Purpose

Optional browser UI for non-developer authors to edit content without touching MDX syntax directly. Primary implementation: Keystatic (Thinkmill, MIT) with typed schemas matching the Authoring content collections; fallback: Sveltia CMS (Research §2.3, §8 Phase 4). Writes the same MDX/YAML files the developer author would hand-write, so Authoring remains the canonical source.

## Aggregates

- **EditorSession** — one author's session editing one Course or Lesson. Aggregate root because it owns the dirty state, the schema projection, and the persistence strategy (local FS or GitHub PR).
- **SchemaProjection** — the form schema derived from a Course/Lesson Zod schema.

## Entities

- _ComponentPalette_ — registry of insertable component blocks (Quiz, RunnablePython, Terminal) exposed to the editor (Research §8 Phase 4).
- _PreviewRenderer_ — the Astro-rendered preview pane showing the in-progress MDX.

## Value objects

- *PersistenceTarget* — `localFilesystem | githubPullRequest`
- *SchemaField* — derived form field descriptor
- *PreviewSnapshot* — a rendered-HTML preview at an edit checkpoint

## Domain events

- `EditorSessionOpened`
- `DraftSaved`
- `DraftCommitted` — to local FS
- `PullRequestOpened` — to the GitHub backend
- `PreviewRefreshed`
- `SchemaValidationFailed` — surfaced inline in the editor UI

## Application services / use cases

- **OpenLessonInEditor** — loads an MDX file and projects its frontmatter through SchemaProjection.
- **InsertComponent** — places a component from ComponentPalette into the MDX body.
- **SaveDraft** — persists through the chosen PersistenceTarget.
- **RefreshPreview** — triggers an Astro sub-build or live-server hot-reload for PreviewSnapshot.
- **OpenPr** — for the GitHub backend, open a PR with the edit.

## Integration with other contexts

- **Upstream — [Identity & Tenancy](./identity-tenancy.md):** OHS — editors authenticate; PR-mode uses GitHub App tokens.
- **Downstream — [Authoring](./authoring.md):** CS — the UI writes MDX files that Authoring then validates. SK on the component-schema contracts.
- **No runtime integration** — Authoring UI is purely a build-time / edit-time concern.

## Invariants and business rules

1. **Keystatic/Sveltia write the exact MDX files Authoring reads** — no intermediate DB, no separate source of truth (Research §2.3).
2. **ComponentPalette entries MUST match the live Component registry** — a palette item with no registered component is a build-time error.
3. **SchemaProjection is derived, not hand-maintained** — regenerated from the Zod schema at build.
4. **PR-mode MUST NOT bypass Authoring validation** — a PR that would fail `ValidateCourse` fails CI.
5. **Editor preview uses the same Astro build as production**, ensuring WYSIWYG parity.
6. **Zero-integration fallback**: Sveltia can be swapped in with a config change if Keystatic's maintenance cadence stalls (Research §2.3, §10.9).
