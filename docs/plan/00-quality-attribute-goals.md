# 00 — Quality Attribute Goals

> Seven quality attributes, one page each. Every goal is numeric, sourced, and tied to an ADR or DDD context. These targets are acceptance inputs to [`02-phase-plan.md`](./02-phase-plan.md) and assertion inputs to [`03-test-strategy.md`](./03-test-strategy.md).

## Scope anchor (ADR 0022, 2026-04-21)

Scope narrowed 2026-04-21 per ADR 0022. Lernkit is an **OSS single-tenant framework** whose success metric is conformance of every exported package
across **SCORM Cloud + five production LMSes** (Moodle, TalentLMS, Docebo, iSpring Learn, SAP SuccessFactors for 2004). There is no hosted SaaS tier,
no multi-tenant surface, no marketplace, no billing. **Portability is therefore the senior quality attribute** on this page — the other six serve it.
See [`PRODUCT-SHAPE.md`](./PRODUCT-SHAPE.md) for the one-page product-shape anchor and [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) for
the scoping decision.

## 1. Functionality

Scope narrowed 2026-04-21 per ADR 0022. Feature-completeness is measured against the interaction vocabulary and the three Lernkit-defining primitives
below. **Enterprise marketplace, billing, and SaaS-tier features are explicitly out of scope** and are not represented in any target on this page.

**Definition in our context.** Feature-completeness against the commercial and open-source interaction vocabulary identified in Research §1.1 and §1.4, plus the three Lernkit-defining primitives that no competitor ships: runnable code, test-graded code challenges, and SCORM/cmi5 round-trip for both.

**Concrete goals.**

- **Tier 1 vocabulary parity by end of P1:** MCQ, multi-response, true/false, fill-in-the-blank, matching, sequencing, drag-and-drop, hotspot, accordion, tabs, flip/flashcards, labeled graphic, process/stepper, timeline, image gallery, video with captions, audio, statement/callout, list, attachment, ungraded knowledge check, graded quiz, bookmarking/resume. Target: **23 of 23** item types ship by 2026-07-13.
- **Tier 2 vocabulary parity by end of P3:** charts, sliders, interactive/branching video, dialogue simulation, software simulation (Show/Try/Test via RF), 360° hotspots (via H5P embed), question banks, custom HTML/JS embed, responsive preview, themes. Target: **8 of 10** Tier 2 types ship by 2026-11-30; the remaining 2 (character/avatar libraries, collaborative review) are deferred to post-P5 as best-effort community contributions (scope narrowed 2026-04-21 per ADR 0022: no enterprise-funded feature track).
- **Tier 3 signature features:** scenario-as-first-class-block (P3), gamification (P4), confidence sliders (P4), live content updates (P4 via Keystatic → GitHub → rebuild ≤5 min), AI authoring assist (P4+ BYO-API-key).
- **Lernkit-defining primitives:** `<RunnablePython>` (P2), `<CodeChallenge>` (P2), `<RunnableJS>` (P3), `<RunnableRF>` (P3), `<Terminal>` (P3), `<Scrim>` v1 (P4).
- **H5P parity reach via `<H5P>` embed:** ≥ 40 of the ~55 H5P content types render without visual regression in a test-course iframe by end of P3. Verified by h5p-standalone smoke tests in CI.

**Tactics (ASRs).**

- Tracker abstraction (ADR 0004) decouples feature count from export count — every new interactive widget gets all five packagers for free.
- MDX component library (WS-B, WS-I) with Zod-validated props fails at build, not runtime (see *Clarity* below).
- `<H5P>` escape hatch (Research §6.10) delivers long-tail breadth without reimplementation.

**Measurement.**

- Vocabulary coverage tracked as a checklist in [`02-phase-plan.md`](./02-phase-plan.md) exit gates.
- Self-referential RF E2E suite exercises every shipped widget per release (see [`03-test-strategy.md`](./03-test-strategy.md)).
- Dogfood course "Intro to Python" (P1) grows a new widget type every merged PR where one is added, providing a continuously maintained integration bed.

## 2. Usability

Scope narrowed 2026-04-21 per ADR 0022. Two audiences only: authors and learners. Enterprise content-reviewer workflows and multi-tenant admin UX are
**out of scope** and are not tracked here.

**Definition.** Two audiences: *authors* writing MDX and composing widgets, and *learners* consuming the rendered course in a browser or an LMS iframe.

**Concrete goals.**

- **Author DX — time to first published lesson** (new MDX author starting from `git clone`): **< 30 minutes** to `pnpm build:scorm` producing a valid zip. Measured against a scripted onboarding walkthrough run monthly with a rotating internal novice.
- **Learner UX Core Web Vitals** on prose pages (SCORM-packaged or public HTML), 75th-percentile on a mid-range laptop over throttled 4G:
  - **LCP < 2.5 s**
  - **INP < 200 ms**
  - **CLS < 0.1**
- **Learner UX on runnable-code pages** (cold cache, cross-origin-isolated runtime page): **LCP < 4.0 s** and **TTI < 5.0 s**. Pyodide wasm deferred until first Run click.
- **WCAG 2.2 AA conformance** across all shipped widgets by end of P3; no Critical or Serious axe-core findings in CI; manual VoiceOver + NVDA spot checks per phase gate.
- **Keyboard navigability:** every interactive widget reachable and operable without a pointing device (tab-order, focus rings, ESC-to-close modals). Enforced via RF + robotframework-browser keyboard-only smoke suite.
- **i18n-ready from P1:** all framework-owned strings extracted to message bundles; target RTL layout correctness by end of P3.

**Tactics.**

- Starlight's built-in docs chrome gives accessible defaults for navigation, search, and typography (ADR 0002).
- Astro islands keep prose pages at near-zero JS, protecting LCP and INP on the most common page type.
- Markdoc option (ADR 0016) for author-safe content reduces the "typo breaks the build" anxiety for ID authors.
- Live Keystatic preview (ADR 0011) gives immediate WYSIWYG feedback.

**Measurement.**

- **Lighthouse CI** budgets per route in the CI pipeline ([`07-ci-cd-pipeline.md`](./07-ci-cd-pipeline.md)). Budget breach fails the PR.
- **axe-core** via `@axe-core/playwright` in the RF E2E suite, one scan per route per build.
- Author-onboarding stopwatch measured monthly; result logged in the monthly architecture review.

## 3. Performance

**Definition.** End-to-end latency budgets for the learner path (page load → code execution → xAPI emit) and the build path (author save → preview deploy).

**Concrete budgets.**

| Budget | Target | Phase introduced |
|---|---|---|
| Initial HTML payload (prose page) | **< 50 KB** gzipped | P1 |
| Prose-page JS (islands only) | **< 15 KB** gzipped | P1 |
| Runnable-page JS (CodeMirror + worker bootstrap, deferred wasm) | **< 300 KB** gzipped | P2 |
| Pyodide cold start, warm HTTP cache | **< 3 s** median, < 5 s p95 | P2 |
| Pyodide cold start, cold cache, throttled "Fast 3G" | **< 10 s** p95 | P2 |
| Code execution wall-clock (warm gVisor pool, Python hello-world) | **< 500 ms** median, < 1.5 s p99 | P3 |
| `/exec` endpoint end-to-end (client-to-result) | **< 1 s** p99 at warm pool | P3 |
| `/xapi` proxy POST | **< 200 ms** p99 | P3 |
| PDF build for 100-lesson course | **< 90 s** on a 4-vCPU runner | P2 |
| Full-site build (500 lessons, CI cold) | **< 6 min** | P1; regression-tracked monthly |
| Preview deploy (Coolify branch deploy on PR merge) | **< 8 min** from push to URL | P0 |
| Conformance CI wall-clock (scope narrowed 2026-04-21 per ADR 0022) | Full SCORM Cloud + 5-LMS **nightly** conformance pass **< 45 min**; fast slice on every main-branch push **< 8 min** | P3 (fast slice); P5 (full nightly) |

**Tactics.**

- Astro islands + Shiki-precompiled highlighting keeps prose JS near zero (ADR 0002).
- Pyodide runtime is **self-hosted** with `immutable` caching (Research §4.1); never jsDelivr.
- Web Worker + Comlink keeps the main thread free during code execution (ADR 0005).
- Warm container pool (WS-G) covers interactive latency; ephemeral containers cover batch grading (Research §4.3).
- Service Worker (WS-O) pre-caches the Pyodide wasm bundle when the learner enters a course with runnable widgets.
- PDF pipeline pre-renders Mermaid to SVG at build so Playwright isn't waiting on JS diagram rendering (Research §5).

**Measurement.**

- **Lighthouse CI** for browser metrics, budget breach = CI red.
- **k6** load tests nightly on `/exec` at 100 concurrent users; p99 tracked in Grafana.
- **Playwright tracing** records Pyodide cold-start timings on throttled-3G profile, uploaded as CI artifact.
- **Bundle size regression** gate: `size-limit` or equivalent fails PR if any island exceeds its declared budget.

## 4. Security

**Definition.** Threat model across the seven bounded contexts; focus on the three highest-risk surfaces identified in [`05-security-model.md`](./05-security-model.md): *Code Execution*, *LMS Launch / LRS Gateway*, *Identity & Tenancy*.

**Concrete goals.**

- **No sandbox escape** in quarterly red-team exercises starting P3 (2026-11-30+). Documented blast-radius containment: an escape lands inside the runner host, never app host or DB.
- **CSP baseline:** default-src 'self'; script-src 'self' with SRI for all third-party scripts; frame-ancestors set per LMS-launch need; no `unsafe-inline` on non-runner pages. Code-runner page scoped separately with COOP/COEP (Research §4.1).
- **No LRS credentials in the browser.** All xAPI traffic routed through the `/xapi` proxy (Research §4.5).
- **SBOM generated on every release** via syft (CycloneDX 1.5 format). Published as a release artifact.
- **Dependency vulnerability scan:** Trivy + Grype in CI on every PR and nightly against main. Target: zero Critical / High CVEs unpatched > 7 days on main.
- **Secret scanning:** gitleaks on every PR; zero leaks into commit history.
- **Incident response SLOs:** detect < 15 min (alert fires), contain < 60 min (kill runner pool / rotate keys), eradicate < 24 h (patch + deploy), public disclosure < 72 h if learner data touched.
- **Disclosure + supply-chain hygiene (scope narrowed 2026-04-21 per ADR 0022):** no enterprise pen-test SLA and no paid bug-bounty program. Instead:
  ongoing **sandbox threat-modeling** (STRIDE refresh per phase gate, per-runner-image review), **dependency scanning in CI** (Trivy + Grype on every
  PR and nightly against main; Semgrep on every PR; gitleaks for secrets), and a **credit-only disclosure program** published in `SECURITY.md` and
  handled via GitHub security advisories. The sandbox-hardening checklist below is unchanged.

**Tactics.**

- gVisor runsc runtime as the default sandbox; Firecracker documented as a self-host opt-in per ADR 0008 for abuse-prone deployments (language narrowed 2026-04-21 per ADR 0022; no multi-tenant framing).
- Hardening checklist mirrored verbatim from Research §4.3 into every runner image build.
- STRIDE threat modeling per context, refreshed at phase gates (see [`05-security-model.md`](./05-security-model.md)).
- License governance and supply-chain posture ([`09-dependency-governance.md`](./09-dependency-governance.md)): cosign-signed images (Sigstore), lockfile review on all PRs, Renovate bot tuned to fail on license drift.
- Secret inventory and rotation policy in [`05-security-model.md`](./05-security-model.md).

**Measurement.**

- **ZAP baseline** weekly against staging; p1/p2 findings = immediate ticket.
- **Trivy + Grype** CVE counts exported to Grafana as gauges.
- **Red-team tabletop** quarterly starting P3; writeups stored in `docs/security/`.
- **Mean-time-to-patch** tracked in the monthly architecture review.

## 5. Portability

Scope narrowed 2026-04-21 per ADR 0022. Portability is the senior quality attribute on this page: the product's success metric is expressed entirely
in portability terms (conformance across a named LMS set).

**Definition.** LMS compatibility, offline capability, data portability.

**Concrete goals.**

- **Success metric (verbatim from [`PRODUCT-SHAPE.md`](./PRODUCT-SHAPE.md)):** Every SCORM 1.2, SCORM 2004 4th Ed, cmi5, and xAPI package Lernkit produces
  imports and runs correctly on SCORM Cloud + Moodle + TalentLMS + Docebo + iSpring Learn (and SAP SuccessFactors for 2004), with 100 % of interactive
  widget state, 100 % of quiz-type xAPI statements, and bookmark / resume behavior verified by the nightly conformance suite.
- **Concrete LMS targets** (the "5 LMSes" behind the success metric, per Research §3.3):
  - **SCORM Cloud** — reference conformance oracle. Failures here block release.
  - **Moodle 4.3+** — the dominant OSS LMS; full SCORM 1.2 / 2004 4th / cmi5 coverage expected.
  - **TalentLMS** — SCORM 1.2 only per Research §3.3; 2004 / cmi5 imports are expected to fail and are documented as such rather than treated as bugs.
  - **Docebo** — the best cmi5 target in the matrix; primary verification for cmi5 features.
  - **iSpring Learn** — SCORM 1.2 / 2004 4th target.
  - **SAP SuccessFactors** — SCORM 2004 4th Ed only. SCORM 2004 3rd Ed is **not supported** by SuccessFactors per Research; packages emitted at the 3rd
    edition level are out of the conformance target set for this LMS.
- **Zero-config import rule.** A package built by Lernkit with **default settings** must import into any of the above LMSes **without manual manifest
  edits**, without a post-process `imsmanifest.xml` patch, and without LMS-specific flags at build time. Per-LMS divergence is absorbed inside the
  packager (ADR 0004 Tracker abstraction, ADR-era unified manifest), not surfaced to the author.
- **SCORM package round-trip** through SCORM Cloud REST API on every main-branch push (P1+). Mean round-trip time < 2 min.
- **Offline capability via Service Worker:** all prose pages and core JS bundles cacheable; Pyodide wasm pre-cached on course entry. Target: lesson readable and runnable with network disabled after first successful load.
- **Data portability:**
  - Raw MDX sources exportable as a tar archive with one CLI command (P1).
  - Full xAPI statement archive exportable from LRS via built-in dashboard (P4).
  - SCORM/cmi5 packages re-importable into Lernkit (reverse operation, P5 stretch).
- **Standards emitted:** SCORM 1.2 (primary, P1), cmi5 (P3), SCORM 2004 4th Ed (opt-in, P3), xAPI bundle (P3), plain HTML (P1).

**Tactics.**

- Single `Tracker` abstraction (ADR 0004) avoids per-standard feature drift.
- Unified manifest from frontmatter as the single source of truth for all five packagers (Research §3.5).
- Conformance CI with SCORM Cloud REST API is the external tie-breaker for "is our package correct?" (Research §3.3).

**Measurement.**

- Conformance tests in CI ([`03-test-strategy.md`](./03-test-strategy.md)).
- Nightly LMS-specific smoke tests against Moodle, TalentLMS, Docebo on staging-deployed packages.
- Documented workaround catalog in `docs/compatibility/` for each LMS-specific quirk encountered.

## 6. Testability

**Definition.** The test pyramid as actually implemented across monorepo packages, FastAPI service, and the self-referential RF E2E suite. Full detail in [`03-test-strategy.md`](./03-test-strategy.md); the goals here are the aggregate targets.

**Concrete goals.**

- **Unit test coverage:** ≥ 80% line coverage on packaging and tracker adapters (WS-C, WS-D) — these are the most-shipped code per learner and the least tolerant of regressions.
- **Integration coverage:** every FastAPI route has at least one Testcontainers-backed integration test with real Postgres + Redis + gVisor runner.
- **Conformance coverage:** SCORM 1.2, 2004 4th, cmi5, and xAPI each round-tripped through SCORM Cloud on every main-branch push.
- **LMS-specific smoke:** nightly runs in Moodle, TalentLMS, and Docebo, against staging packages.
- **Nightly LMS conformance job is the primary Phase-5-and-beyond release gate** (scope narrowed 2026-04-21 per ADR 0022). A red conformance run blocks
  release; the gate covers SCORM Cloud + Moodle + TalentLMS + Docebo + iSpring Learn + SAP SuccessFactors (2004 4th only) per the LMS target list in
  *Portability* above.
- **E2E coverage:** RF + robotframework-browser suite reaches 100% of top-level user journeys (author writes lesson → packages → LMS imports → learner completes → xAPI statement appears) by end of P3. Self-referential: the test suite is itself a Lernkit course.
- **Accessibility:** axe-core in CI per route; zero Critical, zero Serious findings.
- **Performance:** Lighthouse CI per route with budgets from *Performance* above.
- **Security:** ZAP baseline weekly, Semgrep + Trivy + Grype on every PR.
- **Visual regression:** Playwright page snapshots for the MDX component library and PDF output; threshold 0.1% pixel diff.

**Tactics.**

- Test pyramid shape enforced by CI gates — unit tests fast enough to run on every save (<30 s total), E2E fast enough to run on every merge (<20 min).
- Testcontainers isolates integration tests from developer machines.
- SCORM Cloud free tier is the CI conformance oracle (Research §3.3).
- RF + robotframework-browser is the deliberate "dogfood" choice — if the framework's own tests are awkward to write in itself, the authoring DX is wrong (Research §7).

**Measurement.**

- Coverage reports uploaded to the CI artifact store per build; trend visible in Grafana.
- Test-suite wall-clock trend: unit < 30 s, integration < 5 min, E2E < 20 min. Budget breach blocks merge.

## 7. Clarity

**Definition.** How fast a new engineer can reason about an unfamiliar part of the system. Research called out clarity repeatedly as a product differentiator; here it is also a *codebase* attribute.

**Concrete goals.**

- **Every architecturally-significant decision has an ADR** with status and date (ADR 0001). No decision lives only in chat, commit messages, or team memory.
- **[`PRODUCT-SHAPE.md`](./PRODUCT-SHAPE.md) is the one-page scope anchor** (scope narrowed 2026-04-21 per ADR 0022). New contributors read it before
  proposing scope expansions; feature requests outside its bounds are closed with a pointer to ADR 0022.
- **DDD ubiquitous language enforced in code review.** Any name collision between *lesson* (authoring) / *AU* (cmi5) / *activity* (xAPI) / *lesson_status* (SCORM 1.2) must use the context-appropriate term; ambiguous names block merge.
- **Typed content collections with Zod** (Astro): frontmatter schema errors fail the build, not runtime. Specifically: malformed course ID, missing objective, unsupported cmi5 `moveOn`, or broken prerequisite reference must produce an actionable build-time error pointing at the offending file and line.
- **Component prop validation at build.** MDX components throw a typed error at build (via Astro's `vite-plugin-mdx` + our Zod schemas), not silently render broken markup.
- **Documented frontmatter schema** published as both TypeScript types and generated reference docs (from Zod → JSON Schema → Markdoc reference table).
- **CHANGELOG** in Keep-a-Changelog format, semver strict, every release since P1.
- **Test names are ubiquitous-language sentences** ("a Packaging & Export adapter emits a SCORM 1.2 zip with imsmanifest at root"), not test-method abbreviations.

**Tactics.**

- ADR workflow (ADR 0001) locks the format and location.
- DDD context models ([`../ddd/`](../ddd/)) are the vocabulary reference; PR template asks "which context does this touch?"
- Zod-first schema definitions are the single source; TypeScript types and JSON Schema are derived.
- Component library is documented with MDX stories (runnable in the framework itself — more dogfooding).

**Measurement.**

- **ADR freshness check:** any ADR in `proposed` > 30 days gets flagged in the monthly review.
- **Build-error quality audit:** monthly rotating reviewer picks three intentionally-broken frontmatter files and grades the error output for "actionability" (1–5 scale); target ≥ 4.0 average.
- **CHANGELOG completeness:** every merged PR that touches `src/` or `packages/` either updates CHANGELOG or declares `no-changelog` in the PR template (bot-enforced).
- **Ubiquitous-language audit** at each phase gate: fresh reviewer reads three randomly-chosen code files and grades language consistency 1–5; target ≥ 4.0.
