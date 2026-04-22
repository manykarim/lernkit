---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise — primary RF specialist on the team)
informed: future engineering team
---
# 0017 — Test the framework itself with Robot Framework

## Context and Problem Statement

A framework that sells Robot Framework training must be testable end-to-end by Robot Framework. Anything else would be an embarrassing contradiction. But
we also have a Node build pipeline, a FastAPI backend, and a multi-standard packaging surface that needs conformance testing against SCORM Cloud. We need a
layered test strategy that picks the right tool for each layer without sprawling the toolchain.

## Decision Drivers

- **Self-reference.** RF is a first-class language in the product; use it to test the product.
- **Appropriate tool per layer.** Unit tests of Node build scripts should not require a Selenium grid; FastAPI endpoints should not be tested via UI.
- **CI conformance gate for packaging.** SCORM packages must round-trip through SCORM Cloud's REST API on every release.
- **Browser automation.** `robotframework-browser` (Playwright-based) is the modern RF browser library; we already use Playwright for PDF and E2E.
- **Shared Playwright install.** We should not maintain two parallel headless-browser installations in CI.

## Considered Options

- **A:** Layered: Vitest for Node build pipeline, Pytest for FastAPI, Robot Framework (with `robotframework-browser`) for end-to-end, SCORM Cloud REST API as
  CI conformance gate.
- **B:** Everything in Jest + Playwright.
- **C:** Cypress for E2E, keep Vitest + Pytest.
- **D:** Everything in Robot Framework.

## Decision Outcome

Chosen option: **A — layered test stack:**

- **Vitest** — unit tests for the Node build pipeline (packagers, manifest generators, Tracker adapters, CodeMirror configurations).
- **Pytest** — unit and integration tests for the FastAPI service (auth, exec orchestrator, xAPI proxy, quotas).
- **Robot Framework with `robotframework-browser`** — end-to-end tests of the entire system: authoring flow, packaged output in a simulated LMS iframe,
  component behavior, learner journey, PDF output.
- **SCORM Cloud REST API** — CI conformance gate: on every release (not every PR, to save quota), the packaged outputs are imported to SCORM Cloud, launched
  headlessly, exercised by a scripted learner, and conformance reports are collected.

### Why RF at the E2E layer (beyond self-reference)

- `robotframework-browser` (Browser library) is Playwright under the hood — the same engine used for PDF export (ADR 0011), so one Playwright install covers
  both concerns.
- RF's tabular keyword-driven syntax makes E2E tests readable by QA engineers and non-Python engineers — important as the team scales.
- We dogfood the very RF runner we ship (ADR 0009). Bugs in the RF runtime environment surface first in our own test suite, before a customer hits them.
- Test suite doubles as **executable documentation**: the RF tests are themselves a showcase of what RF can do, useful for marketing the framework's RF
  training capability.

### CI layering

| Layer | When it runs | Tool | Scope |
|-------|--------------|------|-------|
| Lint + typecheck | Every commit | eslint, ruff, mypy | Code hygiene |
| Unit — Node | Every PR | Vitest | Packagers, Tracker adapters, build scripts |
| Unit — Python | Every PR | Pytest | FastAPI handlers, runner orchestration |
| E2E | Every PR (fast subset), nightly (full) | Robot Framework + Browser | Authoring → build → launch → complete |
| SCORM Cloud conformance | Every release tag | SCORM Cloud REST API | Import + launch + completion round-trip |
| Load / soak | Weekly | k6 or Locust | Runner pool under 40K-executions/month load |
| Security scan | Every PR | Trivy / Grype on runner images | Known-CVE gate |

### SCORM Cloud gate details

- Uses the free SCORM Cloud tier for basic imports; a paid tier is provisioned for releases when quota pressure demands it.
- Script uploads each output (`scorm12.zip`, `scorm2004-4th.zip`, `cmi5.zip`, `xapi-bundle/`), launches the registration, drives the course via the SCORM
  Cloud "Invite / Review" API, asserts completion and score surface correctly in the SCORM Cloud launch report.
- Failures post the SCORM Cloud launch report link to the PR / release notes for human review.
- Rate-limit aware: exponential backoff, uploads serialized, artifacts cached.

### Five canonical statement shapes (test coverage requirement)

From research §4.5 — E2E tests must exercise all five xAPI statement shapes (see ADR 0013):

1. **executed-code** — RF test types code, hits Run, asserts the `/xapi/statements` batch received.
2. **passed / failed coding challenge** — RF test submits a CodeChallenge with a correct then incorrect answer, asserts correct verbs.
3. **used-hint** — RF test clicks hint, asserts hint index and cost.
4. **reset-cell** — RF test resets a cell, asserts the reset statement and that subsequent execution correlates.
5. **cmi5 session bookends** — RF test launches a cmi5 course, asserts `launched`/`initialized`/`terminated`.

### Consequences

- **Testability, good:** every layer has the right tool; no cross-layer bleed.
- **Testability, good:** SCORM Cloud gate catches conformance drift that unit tests cannot — e.g. an LMS parses `session_time` strictly.
- **Clarity, good:** RF test suite doubles as a showcase of the framework's training capability.
- **Clarity, good:** one Playwright install serves both Paged.js PDF (ADR 0011) and RF Browser library E2E.
- **Performance, mixed:** Robot Framework E2E is not the fastest; we split into a fast PR-time subset (smoke) and a nightly full suite.
- **Cost, note:** SCORM Cloud free tier has quota limits; the gate runs on release tags, not every PR, to stay inside it.

## Pros and Cons of the Options

### A — Layered with RF at E2E — chosen

- Good: right tool per layer; self-referential RF use.
- Good: Playwright shared with PDF.
- Bad: three test frameworks in CI — but each has a clear boundary.

### B — Everything in Jest + Playwright

- Bad: no RF self-use; forfeits the marketing / dogfooding value.
- Bad: Pytest is the natural test tool for FastAPI; forcing Jest against a Python backend is awkward.

### C — Cypress for E2E

- Bad: extra browser automation tool alongside Playwright — two CI installs.
- Bad: no RF self-use.

### D — Everything in Robot Framework

- Bad: RF is wrong for Node unit tests of build scripts (slow startup, no JS runtime integration).
- Bad: RF is wrong for FastAPI unit tests (where Pytest fixtures are the standard).

## Test-suite organization

```
tests/
  unit-node/        # Vitest — packagers, adapters, build scripts
  unit-python/      # Pytest — FastAPI handlers, runners
  e2e/              # Robot Framework — Browser-based learner journeys
    resources/      #   shared keywords
    suites/         #   one suite per lesson type
    smoke/          #   fast subset run on every PR
    nightly/        #   full suite run nightly
  conformance/      # SCORM Cloud round-trip — runs on release
  load/             # k6 / Locust — weekly
```

## Validation

- **Lint / typecheck** green on every PR.
- **Unit suites** complete under 5 minutes combined.
- **E2E smoke** completes under 10 minutes on every PR.
- **E2E full** completes overnight.
- **SCORM Cloud gate** reports green on the release tag before publishing.
- **Coverage budgets** (branch coverage) enforced per package: 80% for Tracker adapters and packagers; 70% for FastAPI handlers; E2E coverage measured by
  scenario count rather than code lines.

## More Information

- Research §7 "Tool stack proposal" (Testing row).
- Research §Phase 1 success metric (SCORM Cloud import).
- Research §3.3 (SCORM Cloud as conformance reference).
- Robot Framework Browser library: https://robotframework-browser.org/.
- SCORM Cloud REST API: https://cloud.scorm.com/docs/v2/.
- Related ADRs: 0009 (RF runner we also dogfood), 0011 (Playwright shared), 0013 (xAPI statement shapes under test), 0015 (packagers under test).
- Open question: if SCORM Cloud's free tier proves insufficient for release cadence, budget a Small plan; monitor quota in the first six months.
