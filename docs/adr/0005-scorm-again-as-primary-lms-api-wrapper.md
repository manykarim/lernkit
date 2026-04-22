---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0005 — Use scorm-again as the primary SCORM 1.2 / 2004 runtime wrapper

## Context and Problem Statement

SCORM packages run inside an LMS iframe and talk to the LMS through a JavaScript `API` object (1.2) or `API_1484_11` (2004) that is discovered by walking
the window chain until `.API`/`.API_1484_11` is found. The runtime must handle the discovery, error codes, implicit commits, auto-terminate on unload,
session timing, data model validation, and — for SCORM 2004 — Simple Sequencing and Navigation. Doing this ourselves is a large security- and
spec-compliance-sensitive effort.

## Decision Drivers

- **Spec coverage.** Library must handle SCORM 1.2 AND SCORM 2004 4th Ed data models in full.
- **2004 sequencing.** Some customers need Simple Sequencing; hand-rolling it is months of work.
- **Active maintenance.** LMS bugs surface regularly; a stalled library becomes our problem.
- **License compatibility.** We ship the library inside customer SCORM zips; a viral copyleft license would infect their use.
- **Footprint.** Ships inside every SCORM package; bundle size is paid per learner launch.
- **Battle-testedness.** Must work in the full LMS fleet (Moodle, Cornerstone, SAP, TalentLMS, Docebo, SCORM Cloud).

## Considered Options

- **scorm-again** (jcputney) — SCORM 1.2 + 2004 + AICC, full 2004 sequencing in v3. License LGPL-3 / MIT mixed (verify per file).
- **pipwerks SCORM wrapper** — MIT, mature (2009), 1.2 and 2004. Legacy, minimal sequencing support.
- **TinCanJS** — Apache 2.0. xAPI 0.9–1.0.0 only; abandoned; no 1.0.3/2.0.
- **simple-scorm-packager** (lmihaidaniel) — MIT, packaging only, uses pipwerks under the hood.
- **react-scorm-provider** (@code-by-dwayne fork) — React context wrapper over pipwerks; not a runtime implementation.
- **Rustici SCORM Engine** — commercial; the industry reference, but licensing and footprint eliminate it as the default.
- **Write our own.** Green-field runtime.

## Decision Outcome

Chosen option: **scorm-again (jcputney) as the primary LMS API wrapper for SCORM 1.2 and SCORM 2004 4th Ed.** It is the only actively maintained open-source
library that ships full SCORM 2004 4th Ed data model support *and* Simple Sequencing in v3, covers AICC as a bonus, and is permissively licensed. It sits
behind the `ScormAgainAdapter12` and `ScormAgainAdapter2004` in ADR 0004 — components never import it directly.

### Risk mitigation (explicit, because it is a single-maintainer project)

- **Vendor the source.** Pin an exact version in `package.json` and mirror the source into a `vendor/scorm-again/` folder at each release. If upstream
  disappears, we can keep shipping.
- **Contribute upstream.** Any bug fix we make lands as a PR to https://github.com/jcputney/scorm-again first. Keeps us in good standing and the project
  healthy.
- **Fallback implementation at the ready.** The `ScormAgainAdapter12` and `ScormAgainAdapter2004` sit behind the `Tracker` interface (ADR 0004). If
  scorm-again becomes unviable we can swap in pipwerks (for 1.2) or a minimal in-house 1.2/2004 wrapper without touching component code.
- **License audit in CI.** A build step inspects each file's SPDX header and fails the build if a GPL- or AGPL-licensed file slips in (scorm-again is
  LGPL-3/MIT mixed per the research; per-file clarity matters for customer-shipped code).

### Consequences

- **Functionality, good:** full SCORM 1.2 + 2004 4th Ed + AICC in one dependency; 2004 sequencing handled.
- **Performance, good:** tree-shakeable ES module; unused data model branches drop at build time.
- **Portability, good:** scorm-again is already field-tested against the major LMSes we must support.
- **Security, good:** no network dependencies at runtime — pure LMS-iframe-API-traversal code.
- **Testability, good:** library exposes data model values directly, simplifying unit tests against expected `cmi.*` writes.
- **Clarity, bad:** a single-maintainer project is a risk (research §Risk #9). Mitigated above.
- **Clarity, bad:** LGPL-3/MIT mixed license requires per-file discipline — the CI license audit addresses this.

## Pros and Cons of the Options

### scorm-again

- Good: only active library that covers SCORM 2004 sequencing.
- Good: supports AICC if a customer surprises us with an AICC-only LMS.
- Good: actively released; issue tracker responds.
- Good: handles the annoying API-finder walk across iframes / openers and window.top chains.
- Bad: single maintainer — mitigated by vendoring + upstream contribution.
- Bad: LGPL-3/MIT mixed license — requires per-file license audit; acceptable.

### pipwerks

- Good: MIT, tiny, rock solid on 1.2.
- Bad: 2004 support is minimal (no Simple Sequencing).
- Bad: last significant update predates modern build tooling — no ES module export; ships CommonJS only.
- Verdict: **legacy fallback only**, useful if we must drop scorm-again.

### TinCanJS

- Bad: xAPI only, and abandoned. Research notes it does not support xAPI 1.0.3 or 2.0.

### simple-scorm-packager

- Good: concrete zip + manifest builder; useful as a packaging *dependency* or reference.
- Bad: not a runtime — does not replace scorm-again.
- Verdict: we may **depend on it or fork it** for the zip builder in ADR 0015; hasn't shipped in four years but the code is small.

### react-scorm-provider

- Bad: wrapper over pipwerks; inherits pipwerks' 2004 gap. Also a non-solution because we want framework-agnostic Tracker behavior, not a React-specific
  context.

### Rustici SCORM Engine

- Bad: commercial; an enterprise tier could bundle it but it is the wrong default.

### Write our own

- Bad: SCORM 2004 4th Ed is a ~600-page spec. Simple Sequencing alone is months of work. Every LMS has quirks that the library is already paper-cut-tested
  against.
- Verdict: only justified if all other options collapse.

## Validation

- **Unit tests:** `ScormAgainAdapter12` calls `LMSSetValue('cmi.core.lesson_status', 'passed')` exactly once on `pass()`; `ScormAgainAdapter2004` writes
  `cmi.completion_status` and `cmi.success_status` independently.
- **Integration tests:** every packaged release is imported to SCORM Cloud (free tier); all Tracker methods exercised by the sample course report correctly
  in the SCORM Cloud launch summary.
- **Manual LMS matrix:** Moodle + TalentLMS + Docebo + SAP SuccessFactors once per major release. Failures filed as upstream scorm-again issues where
  applicable.
- **License scan:** CI runs `license-checker` against `node_modules/scorm-again/**`; output is a committed artifact; any GPL/AGPL hit blocks merge.
- **Source vendoring check:** `vendor/scorm-again/` is regenerated on every release and its SHA matches the tagged `node_modules` version.

## More Information

- Research §3.4 "Tooling choices" — table of LMS runtime libraries.
- Research §10 Risk #9 — single-maintainer/abandonment risk and mitigation.
- Upstream: https://github.com/jcputney/scorm-again.
- Related ADRs: 0003 (standards strategy), 0004 (Tracker interface), 0015 (packaging pipeline).
- Open question / revisit trigger: if scorm-again goes 12 months without a release, promote the fallback path (pipwerks + minimal 2004 in-house) to primary.
