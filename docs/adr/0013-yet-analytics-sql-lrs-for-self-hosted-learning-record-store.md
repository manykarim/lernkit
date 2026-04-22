---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0013 — Use Yet Analytics SQL LRS as the self-hosted Learning Record Store

## Context and Problem Statement

The framework emits xAPI statements at high frequency — code executions, quiz interactions, hint usage, session bookends (ADR 0017 documents the canonical
statement shapes). These statements must land in a Learning Record Store (LRS) that speaks xAPI 2.0, supports cmi5 routing, runs self-hosted on our Hetzner /
Coolify target (ADR 0018), and is actively maintained.

Browsers must **never** hold LRS credentials; xAPI must be routed through a thin proxy service so secrets stay server-side (research §4.5).

## Decision Drivers

- **Self-hosted.** Our default deployment is OSS + self-hosted; a SaaS-only LRS (even a cheap one) is wrong for customers on private networks and is a
  recurring cost.
- **xAPI 2.0 / IEEE 9274.1.1 conformance.** The new xAPI 2.0 spec is the IEEE standard; the LRS must conform, not stall on 1.0.3.
- **Active maintenance.** The LRS is a long-lived data store; an abandoned LRS becomes a migration problem.
- **cmi5 support.** cmi5 is one of our primary standards (ADR 0003); the LRS must route cmi5 `launched`/`initialized`/`terminated` statements correctly.
- **License.** Permissive, or at least compatible with our default MIT core (ADR 0014).
- **Coolify-friendly.** Single Docker image, standard Postgres backend, straightforward env-var config.
- **Tooling ecosystem.** The LRS should integrate with common BI / dashboard tools so analytics (Phase 4) is buildable.

## Considered Options

- **A:** Yet Analytics SQL LRS — Apache 2.0, Clojure + Postgres, xAPI 2.0 / IEEE 9274.1.1 conformant, single Docker image.
- **B:** Trax LRS — Laravel + Vue, MIT, native cmi5, nice admin UI.
- **C:** Learning Locker Community Edition.
- **D:** Commercial SaaS LRS (Watershed, Veracity, SCORM Cloud LRS).
- **E:** Build our own minimal LRS.

## Decision Outcome

Chosen option: **A — Yet Analytics SQL LRS** as the default self-hosted LRS. **Trax LRS** is an acceptable alternative when a customer prefers its native
cmi5 UI. **Learning Locker Community is explicitly rejected.**

### Operational shape

- **Image:** single official Docker image from Yet Analytics.
- **Backend:** Postgres 16 (shared with the FastAPI service's existing Postgres or a dedicated one for isolation — both are valid).
- **Deployment:** Coolify service on the same Hetzner box as the API in the single-tenant default (ADR 0018).
- **Credentials:** the LRS's per-credential-pair ACL model is used; each tenant (or each course) gets a dedicated basic-auth credential with the minimum
  `statements/read` + `statements/write` scopes needed.
- **Proxy pattern:** browsers POST xAPI to the framework's `/xapi` endpoint on the FastAPI service; the service authenticates the learner (SSO session),
  rate-limits, and forwards with the server-side LRS credential. **Browsers never hold LRS credentials.**

### Learning Locker rejection (explicit)

Research §3.4 documents: "Learning Locker Community — effectively abandoned since 2021; HT2 Labs was acquired by Learning Pool and moved the project
enterprise-only." Adopting it would tie us to a frozen codebase or a commercial contract. Rejected.

### Statement shape commitments (from research §4.5)

The LRS must store these five canonical statement families:

1. **executed-code** — custom verb; stdout / stderr / exit in extensions.
2. **passed / failed coding challenge** — ADL registered verbs `http://adlnet.gov/expapi/verbs/passed` and `.../failed`; `result.score.scaled` ∈ [0,1]; per-test
   breakdown in `result.extensions`.
3. **used-hint** — custom verb; `hintIndex` + `cost` in extensions for mastery-style score degradation.
4. **reset-cell** — custom verb; correlates subsequent executions with the reset.
5. **cmi5 session bookends** — `launched` from the LMS, `initialized` on lesson open, `terminated` on `navigator.sendBeacon` at page unload.

### Storage discipline

- **Batch rapid-fire statements** at the proxy (e.g. 500 ms debounce per learner per cell) to reduce LRS write amplification.
- **Store only a `sha256` of the source on every execution**; store full source only on terminal `passed` / `failed` events to bound storage (research §4.5).
- **Retention policy:** keep raw statements for 90 days by default; aggregate older data into summary statements; operator-configurable in `lernkit.config.ts`. (Per ADR 0022 the substrate is single-tenant — retention is per-deployment, not per-tenant.)
- **Summary statements at session end** are the authoritative record for reporting (survives retention pruning of raw statements).

### Consequences

- **Portability, good:** Apache 2.0 license, Docker image, Postgres backend — works on any Linux host under Coolify.
- **Portability, good:** xAPI 2.0 / IEEE 9274.1.1 conformant — interoperable with every other xAPI-2.0 tool.
- **Functionality, good:** cmi5 routing works out of the box; Trax-grade cmi5 UX is not needed because our LMS acts as the cmi5 launcher.
- **Security, good:** proxy pattern keeps credentials server-side; LRS credentials never reach the browser.
- **Performance, mixed:** Clojure + Postgres handles the statement volume for 1,000 MAU comfortably; high-volume deployments may split the LRS onto its own Hetzner host per the ADR 0018 "When we split this box" triggers.
- **Clarity, good:** the data model is standard xAPI — no proprietary extensions to learn beyond the five statement families we document.
- **Clarity, bad:** Clojure operator experience is rarer than Node/Python — operators unfamiliar with JVM tuning may need a short ramp.

## Pros and Cons of the Options

### A — Yet Analytics SQL LRS — chosen

- Good: Apache 2.0; active maintenance; xAPI 2.0 / IEEE 9274.1.1.
- Good: single Docker image; Postgres backend; Coolify-friendly.
- Bad: Clojure operator experience; mitigated by standard JVM monitoring (it is not black-box).

### B — Trax LRS

- Good: native cmi5, attractive admin UI.
- Good: MIT + Laravel + Vue — friendlier operator stack.
- Bad: somewhat smaller community vs Yet Analytics.
- Verdict: valid alternative; not the default but acceptable per-customer.

### C — Learning Locker Community

- Bad: abandoned; enterprise fork is paid. Explicit reject per research.

### D — Commercial SaaS LRS

- Bad: ongoing cost; data lives off-prem; not compatible with private-network customer requirements.
- Good: ops-free. Valid as a customer-paid add-on, not as default.

### E — Build our own

- Bad: xAPI conformance is a long-tail of edge cases; Yet Analytics already passes the ADL conformance suite. Building our own diverts engineering from the
  differentiating product work.

## Proxy service contract

The `/xapi` proxy on FastAPI exposes:

- `POST /xapi/statements` — accepts a batch of statements from an authenticated learner; applies tenant context; forwards to LRS with the server-side
  credential.
- `GET /xapi/statements` — scoped to the current learner / course; used by the learner dashboard (Phase 4).
- `POST /xapi/state`, `POST /xapi/activities/profile` etc. — forwarded with scope checks for the few endpoints cmi5 requires.

**Hard rule:** the LRS credential is never served to the browser, never in JS bundles, never in `.env` files checked in. It lives in the FastAPI service's
runtime secret store only.

## Validation

- **Conformance:** the deployed LRS passes the ADL xAPI 2.0 conformance suite (run in staging, not on every PR).
- **Proxy scope tests:** a learner authenticated as tenant A cannot read statements belonging to tenant B via the proxy (integration test).
- **Batch behavior:** 10 rapid-fire `executed-code` events from one learner result in ≤2 LRS POSTs after debounce.
- **Retention job:** after a simulated 91-day retention window, raw statements older than 90 days are aggregated into summary statements; summary statements
  preserve completion/score outcomes.
- **Credential audit:** a grep pattern in CI fails the build if any file in the frontend bundle contains an LRS credential string.

## More Information

- Research §3.4 "Tooling choices" — LRS row.
- Research §4.5 "xAPI tracking of code execution".
- Research §10 Risk #10 "xAPI statement explosion and storage cost".
- Yet Analytics SQL LRS: https://github.com/yetanalytics/lrsql.
- Trax LRS: https://www.trax-lrs.org/.
- Related ADRs: 0003 (cmi5 standard), 0004 (Tracker interface), 0008 (FastAPI hosts the xAPI proxy), 0017 (test framework covers LRS integration), 0018
  (Coolify/Hetzner deployment).
- Open question: do we ship a Trax preset alongside Yet Analytics SQL LRS to ease customer choice? Deferred to Phase 3 / 4.
