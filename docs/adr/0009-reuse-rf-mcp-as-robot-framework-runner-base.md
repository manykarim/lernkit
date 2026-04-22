---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise — project maintainer of rf-mcp)
informed: future engineering team
---
# 0009 — Reuse ghcr.io/manykarim/rf-mcp:latest as the Robot Framework runner base image

## Context and Problem Statement

Robot Framework (RF) is a first-class language in this framework — Many's expertise is a differentiator and the training market for RF is underserved. RF
lessons come in two operational shapes:

1. **Batch / grading mode** — the learner writes an `.robot` file; we run `robot` CLI against it; parse `output.xml` for pass/fail per test; emit xAPI.
2. **Tutorial / guided mode** — the learner works with an AI tutor that incrementally constructs keywords and steps using `rf-mcp`'s live `ExecutionContext`.
   The tutor calls MCP tools over HTTP; the learner sees each keyword execute in real time.

Both modes need the same base environment: Python, Robot Framework, browser libraries (for web-automation lessons), and the utility keyword set. Maintaining
two separate Docker images is wasteful and diverges. Fortunately, Many already maintains [`rf-mcp`](https://github.com/manykarim/rf-mcp) with a published
image at `ghcr.io/manykarim/rf-mcp:latest` (and a `-vnc` variant that pre-installs Chromium / Firefox / WebKit).

## Decision Drivers

- **Reuse over reimplement.** rf-mcp already bundles RF + Browser/Selenium libraries + browsers. Building a parallel image is duplicate work.
- **Two modes, one image.** The same container can run `robot` CLI for grading and serve `rf-mcp` HTTP for tutorials.
- **Strategic alignment.** Many owns rf-mcp; upstream contributions benefit both projects.
- **Security of browser automation.** Browser libraries inside a sandbox mean nested Chromium — expensive, opens privilege-escalation paths if the sandbox
  fails. We need a separate stricter variant for browser lessons.
- **Log artifact hygiene.** Robot Framework's `log.html` / `report.html` are self-contained HTML — they should be served from a **dedicated isolated origin**
  so they can't poison the main app's security context.

## Considered Options

- **A:** Reuse `ghcr.io/manykarim/rf-mcp:latest` as the runner base for both grading and tutorial modes; use `rf-mcp-vnc` for browser-automation lessons.
- **B:** Build our own RF runner from `python:3.13-slim`; pull RF and libraries in a Dockerfile we maintain.
- **C:** Run RF in Pyodide in the browser.
- **D:** Use the official `robotframework/rfdocker` image or similar community base.

## Decision Outcome

Chosen option: **A — reuse `ghcr.io/manykarim/rf-mcp:latest` as the Robot Framework runner image.** Two-image split for security:

- **`rf-mcp:latest`** — the default runner for lessons using `BuiltIn`, `Collections`, `String`, `DateTime`, `OperatingSystem` (restricted to `/tmp`),
  `Process`, `RequestsLibrary` (with egress proxy), `JSONLibrary`, `XML`. All happy in the hardened gVisor container from ADR 0008.
- **`rf-mcp-vnc`** — the opt-in runner for advanced browser-automation lessons. Runs under stricter TTLs, whitelisted egress, and is the first candidate to
  promote to Firecracker isolation (per ADR 0008) for operators running abuse-prone deployments. (Framing narrowed 2026-04-21 per ADR 0022: single-tenant substrate; Firecracker is a per-deployment hardening opt-in.)

### Dual operational modes

- **Grading / batch mode.** The orchestrator runs the classic `robot` CLI inside the container against the learner's `.robot` file. The container exits; a
  trusted sidecar parses `output.xml` via `robot.api.ExecutionResult`; the orchestrator emits pass/fail counts and xAPI statements through the Tracker
  interface.
- **Tutorial / guided mode.** The container runs `rf-mcp` as an HTTP MCP server with `tool_profile=minimal_exec` (or `api_exec`) exposing a curated subset of
  MCP tools to the AI tutor. The tutor adds keywords, and the learner watches them execute step-by-step against the live `ExecutionContext`.

### log.html / report.html serving

- Serve RF artifacts from a **separate isolated origin** (e.g. `logs.example.com`) with strict CSP.
- Embed in an iframe with `sandbox="allow-same-origin"` so `log.html`'s relative links work without poisoning the main app origin.
- No shared cookies, no LRS credentials, no SSO tokens reachable from that origin.

### Upstream contribution: `learning_exec` tool profile

Because Many owns rf-mcp, we contribute a dedicated `learning_exec` tool profile that surfaces:

- Grading hooks (test-pass count, failure localization, `output.xml` summary).
- xAPI statement emitters (passed-coding-challenge, failed-coding-challenge, used-hint, reset-cell) per ADR 0013 / ADR 0017.
- UI-friendly state projections (current keyword, stack depth, step count) the framework's RF tutorial component consumes.

This becomes an upstream contribution that benefits both projects and keeps rf-mcp aligned with the training framework's needs.

### Beginner vs advanced split (from research §4.4)

- **Beginner lessons** — `BuiltIn`, `Collections`, `String`, `DateTime`, `OperatingSystem` (limited to `/tmp`), `Process`, `RequestsLibrary` (with egress
  proxy), `JSONLibrary`, `XML`. Run under `rf-mcp:latest` in the default gVisor sandbox.
- **Advanced browser lessons** — SeleniumLibrary, Browser library, MobileLibrary. Run under `rf-mcp-vnc` with:
  - Stricter wall-clock TTL (e.g. 120 s default vs 300 s for non-browser lessons).
  - Whitelisted egress proxy (learners cannot scrape arbitrary public sites).
  - Higher priority for Firecracker promotion when multi-tenant isolation is needed.

### Consequences

- **Functionality, good:** covers RF training end-to-end, including the rare "run real browsers in a lesson" use case.
- **Functionality, good:** dual modes (batch + tutorial) let a single course blend traditional grading with AI-guided exploration.
- **Portability, good:** standard Docker image pulled from a public GHCR — works on any runner host in ADR 0008's architecture.
- **Security, mixed:** browser-in-sandbox is inherently heavier than non-browser RF; mitigated by separate image + stricter limits + egress whitelist.
- **Security, good:** dedicated logs origin isolates `log.html` / `report.html` from the main app context.
- **Clarity, good:** one image, two modes, documented boundaries between beginner and advanced runners.
- **Clarity, bad:** dependency on an upstream project Many maintains — a bus-factor risk mitigated by the fact Many is on this project and by MIT-licensed
  source we can vendor if needed.
- **Testability, good:** the `learning_exec` profile's hooks are a documented contract; CI can mock them for component tests and exercise them against a
  real container for integration tests.

## Pros and Cons of the Options

### A — Reuse rf-mcp (chosen)

- Good: zero duplicate work; Many already maintains a production-quality image.
- Good: MCP tutorial mode is a category-defining feature in an AI-assisted training context.
- Good: upstream contributions flow back to rf-mcp and benefit both projects.
- Bad: couples framework to rf-mcp's release cadence. Mitigated: Many is the maintainer and a direct stakeholder.

### B — Roll our own RF image

- Bad: duplicates the work Many's rf-mcp image already does.
- Bad: forfeits MCP tutorial mode unless we also build our own MCP server.

### C — RF in Pyodide

- Bad: research explicitly labels this experimental — SeleniumLibrary, Browser, SSH, OperatingSystem do not work in WASM.
- Good: installable (`micropip.install("robotframework")`) for tiny pure-keyword demos.
- Verdict: treat in-browser RF as experimental; server-side via rf-mcp is canonical.

### D — Community base image (robotframework/rfdocker etc.)

- Bad: no MCP server — loses tutorial mode.
- Bad: we still maintain a parallel image for our needs.

## Validation

- **Grading mode integration test:** a sample "write a test that asserts 2+2==4" lesson runs the learner's submission under `rf-mcp:latest`, parses the
  resulting `output.xml`, and emits the expected pass statement.
- **Tutorial mode integration test:** a scripted MCP client drives the `learning_exec` profile through a known sequence and verifies the state projections
  update in expected order.
- **Browser lesson integration test:** a sample SeleniumLibrary lesson runs under `rf-mcp-vnc` with stricter limits; a deliberate infinite-loop test is
  killed at the TTL; the sandbox is not escaped.
- **log.html isolation test:** a crafted `log.html` with malicious JS embeds in the main-app iframe; the dedicated origin's CSP + sandbox prevent access to
  the host origin's cookies and localStorage.
- **Image freshness CI:** weekly job pulls `ghcr.io/manykarim/rf-mcp:latest`, runs the smoke suite, and opens an issue on drift.

## More Information

- Research §4.4 "Robot Framework execution — synergy with rf-mcp".
- Research §10 Risk #7 "Robot Framework browser automation in lessons".
- rf-mcp upstream: https://github.com/manykarim/rf-mcp.
- Related ADRs: 0008 (server-side sandbox that hosts these images), 0013 (LRS + xAPI proxy), 0017 (test framework uses RF).
- Open question: when to promote `rf-mcp-vnc` to Firecracker isolation? Trigger: the first deployment running browser RF lessons exposed to an untrusted public learner pool (per ADR 0008 self-host opt-in framing).
