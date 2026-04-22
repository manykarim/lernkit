---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0003 — Prioritize cmi5 and SCORM 1.2 with SCORM 2004 4th Ed opt-in

## Context and Problem Statement

A technical-training framework must publish to whatever LMS a customer already operates. Supporting *every* packaging standard doubles the test matrix and
ships dead code in every build. We need a policy that chooses which standards are first-class, which are opt-in, and which are dropped — grounded in real LMS
behavior, not spec coverage.

## Decision Drivers

- **Market reach.** SCORM 1.2 is universally supported by corporate LMSes and accounts for ~86% of real-world SCORM exports (per ScormHero, cited in
  research §3.1).
- **Modern analytics.** xAPI/cmi5 enables rich per-statement tracking that SCORM 1.2's `cmi.suspend_data` cannot carry (4,096-character cap, vs 64,000 in
  2004).
- **LMS behavior landmines** documented in research §3.3:
  - **TalentLMS is SCORM 1.2 only.** Shipping only a 2004 package locks TalentLMS customers out.
  - **SAP SuccessFactors accepts 2nd and 4th Ed but not 3rd**, and **cannot replace a 1.2 package with a 2004 package** (SAP KB 2320891) — forcing a
    re-upload rather than an update.
  - **Moodle's SCORM 2004 support is incomplete** (no Simple Sequencing or Navigation natively).
  - **Cornerstone receives interactions but does not persist them.**
- **cmi5 is gaining traction** (Docebo, TalentLMS, SCORM Cloud, Rustici Engine, Trax, Watershed) and is the right modern export — iframe-free, mobile/offline
  capable, statements stored in an LRS.
- **SCORM 2004 2nd and 3rd Editions are rarely needed.** A 4th Ed package usually works in 3rd Ed LMSes with a `schemaversion` string swap.
- **SCORM Cloud's free tier is the de-facto conformance reference** and has a REST API suitable for CI.

## Considered Options

- **A:** cmi5 + SCORM 1.2 default, SCORM 2004 4th Ed opt-in, xAPI standalone as advanced config. Drop SCORM 2004 2nd/3rd Ed.
- **B:** SCORM 2004 4th Ed default, with 1.2 fallback.
- **C:** Ship all five (1.2, 2004 2nd/3rd/4th, xAPI, cmi5) as first-class outputs.
- **D:** cmi5 only, bet on the future.

## Decision Outcome

Chosen option: **A — cmi5 + SCORM 1.2 as the default export, SCORM 2004 4th Ed as opt-in, raw xAPI as a standalone configuration. SCORM 2004 2nd and 3rd
Editions are not first-class outputs.** cmi5 is the modern path forward; SCORM 1.2 is the universal safety net; SCORM 2004 4th Ed is the compromise when a
customer's LMS genuinely requires sequencing or split completion/success reporting.

This policy maps directly onto the packagers in ADR 0015: `scorm12`, `scorm2004-4th`, `cmi5`, `xapi-bundle`, `plain-html`.

### Consequences

- **Portability, good:** the default export covers ~86% SCORM-1.2-dominated LMS fleet *and* the growing cmi5-capable segment (Docebo, SCORM Cloud, Trax)
  simultaneously.
- **Portability, bad:** customers on "2004 3rd Ed only" islands must use the 4th Ed export with a documented `schemaversion` swap workaround.
- **Performance, good:** dropping 2nd/3rd Ed removes two packagers, two manifest templates, and two conformance test runs from CI.
- **Testability, good:** CI gate is SCORM Cloud REST API (see ADR 0017) — every release runs every packaged standard through SCORM Cloud before merge.
- **Clarity, good:** authors write against a single `Tracker` interface (ADR 0004); the standards complexity lives inside the packager, not in lesson
  authoring.
- **Security, good:** cmi5's LRS-backed model lets us route all xAPI through a proxy (so browsers never hold LRS credentials, see ADR 0013).

## Pros and Cons of the Options

### A — cmi5 + 1.2 default, 2004 4th opt-in, xAPI standalone

- Good: covers the LMS fleet documented in research §3.3 without over-investing in the narrow 2004 segment.
- Good: lets customers adopt cmi5 incrementally while keeping 1.2 as the "always works" fallback.
- Good: single packaging story for the unified Tracker interface.
- Bad: two packages per release is slightly more CI work than option D; accepted.

### B — 2004 4th Ed default

- Bad: **TalentLMS is 1.2-only** — making 2004 the default disenfranchises a whole LMS tier.
- Bad: Moodle's 2004 support is incomplete; defaulting to 2004 guarantees Moodle bug reports.

### C — Ship all five SCORM flavors

- Bad: duplicate manifests, double the LMS-specific bugs, 2nd/3rd Ed has no real market gain over 4th Ed with `schemaversion` swap.
- Bad: CI conformance matrix explodes to 5× the runtime cost.

### D — cmi5 only

- Bad: eliminates the 86% SCORM-1.2 fleet at stroke. Only defensible for a greenfield LMS customer base — not the technical-training market we target.

## Critical Standards Facts (locked in)

From research §3.2; these are implementation constraints the packagers must honor:

- **SCORM 1.2 `cmi.suspend_data` is 4,096 characters maximum.** SCORM 2004 raises this to 64,000. The framework's bookmark/resume state for 1.2 targets must
  stay well under 4 KB.
- **SCORM 1.2 `lesson_status` is a single field.** Writing "passed" erases "completed". The Tracker's `pass()` call must not race `complete()` on 1.2
  targets.
- **SCORM 2004 splits `cmi.completion_status` and `cmi.success_status`.** `complete()` and `pass()` are independent writes.
- **SCORM 1.2 `session_time` is `HH:MM:SS.SS`, not ISO 8601.** SCORM 2004 uses ISO 8601 duration.
- **`imsmanifest.xml` must be at the zip root.** Never include `__MACOSX/` or `.DS_Store` (macOS authoring landmine — the #1 import-failure cause).
- **xAPI activity IDs are stable IRIs.** Changing them on re-publish fragments learner history — the build must hash activity IDs from course+lesson slugs,
  not from timestamps.

## Validation

- **CI conformance gate:** every PR that touches a packager runs the output zip through the SCORM Cloud REST API for each published standard (1.2, 2004 4th,
  cmi5). Failures block merge.
- **Unit tests on zip structure:** `imsmanifest.xml` at root, no `__MACOSX/`, no `.DS_Store`, no absolute URLs in bundled assets, suspend\_data serialization
  fits in 4096 chars for 1.2.
- **Round-trip tests:** import each standard's package into SCORM Cloud; launch; complete a quiz; verify the score and completion surface correctly in the
  LMS report. Documented in the LMS compatibility matrix.
- **Manual matrix (documented, not CI'd) for Moodle, TalentLMS, Docebo, SAP SuccessFactors** at each major release — these LMSes have reproducible
  quirks that SCORM Cloud does not catch.

## More Information

- Research §3.1 "Which standards to emit and why"; §3.2 "Critical standards facts engineers will trip on"; §3.3 "LMS compatibility test matrix".
- Related ADRs: 0004 (unified Tracker), 0005 (scorm-again runtime), 0013 (self-hosted LRS), 0015 (packaging pipeline), 0017 (CI/conformance testing).
- LiaScript-Exporter source is the authoritative reference for manifest structure and the ILIAS/OpenOLAT iframe workaround.
- Open question / revisit trigger: if cmi5 reaches >50% LMS market share, promote cmi5 to sole default and demote SCORM 1.2 to "legacy export" status.
