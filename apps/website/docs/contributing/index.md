---
id: index
title: Contributing
sidebar_label: Overview
sidebar_position: 1
---

# Contributing

## Local dev setup

```bash
git clone https://github.com/manykarim/lernkit.git
cd lernkit
pnpm install
```

`pnpm install` runs the post-install scripts that vendor Pyodide and the RF
libdocs into `apps/docs/public/`. Expect ~30 seconds extra the first time.

## Common commands

| Command | Purpose |
|---|---|
| `pnpm dev` | All packages in watch mode (turbo) |
| `pnpm --filter=@lernkit/docs dev` | Just the rf-training course site |
| `pnpm --filter=@lernkit/website dev` | Just this docs site |
| `pnpm test` | Vitest across all packages |
| `pnpm typecheck` | tsc + astro check across the workspace |
| `pnpm lint` | Biome check (read-only) |
| `pnpm lint:fix` | Biome check + auto-fix |
| `pnpm build` | Build everything (turbo) |
| `pnpm build:scorm12` | Build the docs course site + package as SCORM |

## Repo layout

See [Architecture → Repo layout](/architecture#repo-layout).

## Adding an ADR

1. Pick the next number in `docs/adr/` (e.g., `0025-…`).
2. Copy the most recent ADR as a template.
3. Fill in **Status** (proposed → accepted), **Context**, **Decision**,
   **Consequences**.
4. Open a PR. The ADR loader plugin picks it up on next build.

## Adding a new package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json` (extends
   `@lernkit/config/tsconfig.base`), `src/index.ts`.
2. Add to `pnpm-workspace.yaml` is automatic (the glob includes
   `packages/*`).
3. Add tests; mirror the layout of `packages/tracker/` for the simplest case
   or `packages/packagers/` for one with assets.
4. If exposing an API surface, ensure `src/index.ts` has `/** */` summaries
   on every exported symbol — the TypeDoc plugin generates the API reference
   from these.

## Releasing

:::info Phase 1 stub

The release process (changesets vs manual tags) is being decided.
For now, commits land on `main`; tags trigger nothing automatic yet.

:::

## Code style

- **Biome** for formatting and linting. Run `pnpm lint:fix` before
  committing.
- **TypeScript strict mode** including `noUncheckedIndexedAccess`. Array
  access yields `T | undefined`; handle the `undefined` case.
- **No emojis in source files** unless in user-visible UI strings or doc
  pages.
- **Comments explain *why*, not *what*.** Well-named code self-documents
  the *what*; comments are for non-obvious context.
