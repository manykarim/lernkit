# Product shape

> One-page anchor for what Lernkit is and is not. Read this before proposing scope expansions.

## What Lernkit is

An **OSS single-tenant framework** for authoring technical-training courses and exporting them as **conformant, feature-complete SCORM 1.2 / SCORM 2004
4th Ed / cmi5 / xAPI** course packages, with **runnable code as a first-class primitive** (Python in the browser via Pyodide, JavaScript via Sandpack,
Robot Framework via rf-mcp), deployable on a single Coolify + Hetzner box.

## What Lernkit is not

- Not a hosted SaaS. There is no managed offering at any region.
- Not a multi-tenant platform. A single Lernkit deployment serves a single organization.
- Not a course marketplace. No catalog, no ratings, no discovery, no revenue share.
- Not a billing platform. No Stripe, no tax, no subscription plans.
- Not an enterprise IdP connector kit. A generic OIDC adapter exists; vendor-specific flows are out of scope.
- Not a bug-bounty program at enterprise SLA. A credit-only disclosure program handles security reports.

Feature requests in these directions are closed with a pointer to [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md).

## How Lernkit is operated

- One repo, MIT-licensed (ADR 0014).
- Self-host-first infrastructure (ADR 0021). Error tracking, chat, LRS, metrics, and search all run on the same Coolify box as the app.
- GitHub for source, issues, CI, and Container Registry (explicit exception in ADR 0021).
- Production and staging share the same Coolify + Hetzner substrate (ADR 0018).
- Local development runs docker-compose against the same service set.

## Success metric

> Every SCORM 1.2, SCORM 2004 4th Ed, cmi5, and xAPI package Lernkit produces imports and runs correctly on SCORM Cloud + Moodle + TalentLMS + Docebo +
> iSpring Learn (and SAP SuccessFactors for 2004), with 100 % of interactive widget state, 100 % of quiz-type xAPI statements, and bookmark / resume
> behavior verified by the nightly conformance suite.

This metric replaces any "paying enterprise customer" language from earlier drafts.

## The three decisions that shape everything else

1. **Runnable code in lessons** is the product. If a change makes runnable code less reliable, safer, faster, or more teachable, it is probably right.
2. **Conformance beats features.** A new feature that cannot pass SCORM Cloud conformance in CI ships behind a flag until it can.
3. **One-substrate operation.** A decision that doubles the number of external services required to run Lernkit needs a strong justification.

## Who the users are

- **Authors** — technical trainers, SDET leads, Robot Framework Foundation members, engineering-education teams, internal L&D at engineering orgs.
  They write lessons in MDX / Markdoc, use runnable-code components, and ship SCORM packages to their LMS of choice.
- **Learners** — engineers and QA engineers taking training. They interact with runnable code, quizzes, and scenario content inside an LMS iframe
  or (for public training) a plain-HTML deploy.
- **Ops** — whoever runs the Coolify box. Often the author themselves for small deployments; an internal IT team for larger ones.

## What good day-90 looks like (tracked in `02-phase-plan.md`)

Authors write lessons with runnable Python, Robot Framework, and JS. Packages build to all four standards. A non-trivial course imports cleanly to
Moodle and TalentLMS. Completion, score, and code-execution events appear in the LMS and in the self-hosted LRS. A PDF export is print-shop quality.
The Coolify box stays up without intervention.

## Related reading

- [ADR 0022 — OSS single-tenant framework scope](../adr/0022-oss-single-tenant-framework-scope.md)
- [ADR 0021 — Self-host-first infrastructure principle](../adr/0021-self-host-first-infrastructure-principle.md)
- [ADR 0018 — Coolify + Hetzner default deployment](../adr/0018-coolify-on-hetzner-for-self-hosting-default.md)
- [ADR 0014 — MIT license](../adr/0014-mit-license-for-framework-core.md)
- [Implementation plan README](./README.md)
