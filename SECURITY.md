# Security policy

## Supported versions

Phase 0 scaffolding is **pre-release** — no supported versions yet. Once we ship a 0.1 release, this table will list the versions receiving security updates.

## Reporting a vulnerability

Please report security vulnerabilities through GitHub's private vulnerability reporting flow:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Fill in the form. Include reproduction steps, affected versions, and any proof-of-concept you are comfortable sharing.

Alternatively, if you cannot use GitHub's flow, email the maintainers directly — contact details are in the repository's root `README.md`.

### What to expect

- Acknowledgement within **3 business days**.
- Triage and severity assessment within **7 business days**.
- Remediation target per severity:
  - Critical: within 7 days, coordinated disclosure.
  - High: within 30 days.
  - Medium / Low: next scheduled release.
- We follow **coordinated disclosure**: published after a fix ships, with credit to the reporter unless they prefer anonymity.

## Disclosure program

Per [ADR 0022](./docs/adr/0022-oss-single-tenant-framework-scope.md) and [`docs/plan/05-security-model.md`](./docs/plan/05-security-model.md), Lernkit runs a **credit-only disclosure program**. There is no paid bug bounty. Reporters of valid issues are named in the advisory and the release CHANGELOG unless they prefer anonymity.

## Scope

In-scope: this repository, the published `@lernkit/*` packages, the project-hosted instance of the documentation site, and the sample Coolify deployment recipe.

Out-of-scope: downstream deployments customers run themselves (please report those to the operator), public-facing GitHub infrastructure (report to GitHub), and dependencies maintained upstream (report to the upstream project, optionally cc'ing us so we can track).

## Sensitive areas

The code-execution sandbox (per [ADR 0008](./docs/adr/0008-server-side-code-execution-fastapi-docker-gvisor.md)) is the highest-risk surface. Sandbox-escape reports are treated as Critical on arrival.
