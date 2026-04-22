# Contributing

Thanks for considering a contribution. Lernkit is MIT-licensed ([ADR 0014](./docs/adr/0014-mit-license-for-framework-core.md)) and welcomes outside contributions.

## Before you start

- Read [`docs/plan/PRODUCT-SHAPE.md`](./docs/plan/PRODUCT-SHAPE.md) — it is a one-page summary of what Lernkit is and is not. Feature requests outside that scope are closed with a pointer to [ADR 0022](./docs/adr/0022-oss-single-tenant-framework-scope.md).
- Skim the ADR index at [`docs/adr/README.md`](./docs/adr/README.md). Decisions that look weird usually have a reason in an ADR.
- Check the open-questions register at [`docs/plan/10-open-questions.md`](./docs/plan/10-open-questions.md) before proposing an alternative to a documented decision.

## DCO sign-off

We use the [Developer Certificate of Origin](https://developercertificate.org/) rather than a CLA. Every commit must carry a `Signed-off-by` line:

```
Signed-off-by: Jane Doe <jane@example.com>
```

Add automatically with `git commit -s`. See [ADR 0014](./docs/adr/0014-mit-license-for-framework-core.md) for the policy.

## Development setup

See the **Quick start** section in the root [`README.md`](./README.md).

## Branch, commit, PR

- **Branch name:** `feat/...`, `fix/...`, `docs/...`, `chore/...`.
- **Commit message:** imperative mood ("Add X", not "Added X"). One logical change per commit.
- **PR size:** small preferred. Split refactors from behavior changes.
- **PR description:** fill the template. Every PR must name the ADR(s) and DDD context(s) it touches.

## Checks before you push

```bash
pnpm lint          # Biome check
pnpm typecheck     # tsc --noEmit across packages
pnpm test          # Vitest (packages) + Pytest (api)
pnpm build         # full turbo build
```

PRs that fail any of these will be red in CI.

## Writing an ADR

If your change introduces, reverses, or retires an architectural decision, write an ADR. See [ADR 0001](./docs/adr/0001-use-madr-for-architecture-decisions.md) for the process.

## Code of conduct

Participation in Lernkit is covered by the [Contributor Covenant](./CODE_OF_CONDUCT.md).
