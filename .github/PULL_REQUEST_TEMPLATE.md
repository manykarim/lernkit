<!--
Thanks for the contribution. Please fill in each section. Short is fine;
empty is not.
-->

## Summary

<!-- One or two sentences on what this PR changes and why. -->

## ADRs and DDD contexts touched

<!-- Name the ADR(s) and DDD context(s) this PR affects. Example:
-   ADR 0004 (Tracker interface)
-   DDD context: Tracking
If this PR introduces a new architectural decision, link the new ADR.
-->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor (no behavior change)
- [ ] Docs / ADR / plan update
- [ ] Chore (tooling, CI, dependencies)

## Checklist

- [ ] `pnpm lint` is green
- [ ] `pnpm typecheck` is green
- [ ] `pnpm test` is green
- [ ] `pnpm build` is green
- [ ] `uv run pytest` (if `apps/api` changed) is green
- [ ] No GPL / AGPL code copied into the core package (ADR 0014)
- [ ] All commits are `Signed-off-by` per DCO

## Scope fit

- [ ] This change is in scope per [`docs/plan/PRODUCT-SHAPE.md`](../docs/plan/PRODUCT-SHAPE.md) (no hosted SaaS, no multi-tenant, no marketplace, no billing per [ADR 0022](../docs/adr/0022-oss-single-tenant-framework-scope.md)).
