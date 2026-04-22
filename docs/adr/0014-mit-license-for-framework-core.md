---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0014 — License the framework core and components under MIT

## Context and Problem Statement

An open-source authoring framework needs a default license for its core code and component library. The license choice affects adoption (enterprise legal
teams, SaaS vendors, forks), contribution (who can contribute and how), and interaction with upstream dependencies (some of which are LGPL or GPL). We must
pick a license that maximizes adoption without giving up leverage we actually need.

## Decision Drivers

- **Adoption.** Enterprise buyers and SaaS vendors avoid copyleft licenses by default. A permissive license removes a friction point at procurement time.
- **Precedent.** H5P core is MIT. Astro, Starlight, MDX, Sandpack, Keystatic, Paged.js, Pyodide (MPL 2.0), Yet Analytics SQL LRS (Apache 2.0) are all
  permissive. Our stack already assumes permissive.
- **Patent grant.** Apache 2.0 has an explicit patent-grant clause MIT lacks; this matters for some corporate contributors.
- **Compatibility with GPL/AGPL plugins.** Some dependencies or contributed modules may legitimately be GPL (Adapt Spoor-derived code, for example). MIT core
  + GPL plugin is a common, legally clean pattern.
- **Ethos.** Training content should be widely reusable; the framework that produces it should not be more restrictive than the content.

## Considered Options

- **A:** MIT for core and components. Optional plugins may be GPL or AGPL if they derive from copyleft upstream.
- **B:** Apache 2.0 for core and components.
- **C:** GPL v2 (mirrors Adapt Framework).
- **D:** AGPL v3 (strongest copyleft; forces SaaS operators to share modifications).
- **E:** Business Source License (BSL) with a commercial-use restriction that converts to MIT after N years.

## Decision Outcome

Chosen option: **A — MIT on the framework core and all first-party components.** GPL / AGPL plugins are allowed as **optional** dependencies when they derive
from copyleft upstream projects (e.g. Adapt Spoor-derived packaging code would remain GPL), but they are never required for the framework to function.

### Policy details

- **Framework repo `LICENSE`**: MIT with the project copyright line.
- **Component packages** (`@lernkit/*` npm packages etc.): MIT, individually declared in each `package.json`.
- **Optional plugins** with copyleft upstream code live in separately-published packages; their `LICENSE` file names the inherited copyleft terms.
- **Vendor dependencies** retain their original licenses; we document aggregate license compliance per release.
- **Contribution model:** a Developer Certificate of Origin (DCO) sign-off per commit — not a CLA. No copyright assignment to the project.
- **License scan in CI:** the build fails on the inadvertent introduction of a GPL / AGPL file into the core package. License-checker runs on every PR (see
  ADR 0005 for the SCORM-again-specific version of this check).

### Consequences

- **Adoption, good:** enterprise procurement sees a permissive license and passes. SaaS vendors can embed the framework without copyleft obligations.
- **Adoption, good:** content authors and customers can fork, adapt, and embed without negotiation.
- **Clarity, good:** MIT is the best-understood license in the JS / Python ecosystem; license audits are fast.
- **Clarity, good:** separation of MIT core and optional GPL plugins is legally clean and well-trodden.
- **Patent protection, mixed:** MIT lacks an explicit patent grant; this rarely matters in practice for training-software but a large corporate contributor
  who wants one can contribute under Apache-2.0-compatible terms and we can dual-license if needed.
- **Clarity, bad:** contributors sometimes paste GPL-licensed code (e.g. from Adapt); the CI license scan and PR-template checkbox catch this before merge.

## Pros and Cons of the Options

### A — MIT core + optional copyleft plugins — chosen

- Good: mirrors H5P core; maximum adoption.
- Good: compatible with every dependency we already chose.
- Good: leaves the door open to GPL plugins for specific derivative work without infecting the core.
- Bad: no explicit patent grant — addressed by a project-level patent policy in the CONTRIBUTING file if needed later.

### B — Apache 2.0

- Good: explicit patent grant.
- Good: compatible with GPL v3 (not v2).
- Bad: incompatible with GPL v2 — would fork us away from any GPL v2 code we might want to integrate (e.g. Adapt Spoor-derived).
- Bad: slightly heavier on notices and attribution than MIT.
- Verdict: defensible alternative; rejected because of GPL v2 incompatibility.

### C — GPL v2

- Bad: scares enterprise adopters.
- Bad: restricts the kinds of plugins / extensions that can be built.
- Bad: does not match the permissive rest of the stack.

### D — AGPL v3

- Bad: strongest copyleft; forces SaaS operators to publish modifications. Disqualifying for enterprise SaaS embedding.

### E — BSL with delayed conversion

- Good: protects a future commercial offering.
- Bad: inhibits open-source adoption at the moment that matters most (project launch).
- Bad: the conversion window creates FUD for adopters.

## Contribution mechanics

- **DCO sign-off** on every commit (`Signed-off-by: Name <email>`) — lightweight, no CLA needed.
- **CONTRIBUTING.md** names the MIT license explicitly and references the DCO.
- **No copyright assignment** — contributors retain copyright; the project has a non-exclusive MIT license to use their contributions.
- **License headers** are not required on every file (MIT is non-viral) but SPDX identifiers are encouraged for rapid scanning.

## Validation

- **CI license scan:** `license-checker --onlyAllow 'MIT;ISC;Apache-2.0;BSD-3-Clause;BSD-2-Clause;CC0-1.0;0BSD;MPL-2.0;LGPL-3.0'` (or a narrow list) — a
  transitive dependency outside this list fails the build unless explicitly allow-listed with a rationale.
- **Manual license audit at each minor release** — produces a license report consumable by enterprise procurement.
- **PR-template checkbox:** "No GPL / AGPL code has been copied into this PR without placing it in an optional plugin package."

## More Information

- Research §10 "Open questions worth resolving before phase 1" — explicit recommendation of MIT core.
- H5P core: MIT (reference precedent).
- SPDX: https://spdx.org/licenses/.
- Related ADRs: 0005 (scorm-again license handling), 0013 (LRS — Apache 2.0 dependency).
- Open question: dual-license under Apache-2.0 alongside MIT if a major corporate contributor asks. Deferred; either approach preserves user freedom.
