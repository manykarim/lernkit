# LMS Launch / LRS Gateway — Context Model

## Purpose

Handle the launch handshake with LMSes (SCORM API contract for 1.2/2004, cmi5 launch URL parameter exchange) and proxy xAPI Statements to the LRS so browsers never carry LRS credentials (Research §4.5, §7). Also shield upstream contexts from LMS quirks (Moodle SCORM 2004 gaps, SAP SuccessFactors' 2nd/4th-but-not-3rd behavior, TalentLMS 1.2-only, Cornerstone dropping interactions — Research §3.3).

This context is a **Conformist** to three external specs and an **ACL** inbound against LMS quirks.

## Aggregates

- **Launch** — one learner-LMS launch sequence. Aggregate root because it owns the handshake state, the resolved Registration, and the authenticated session token.
- **StatementProxy** — the outbound proxy lifecycle for one Launch. Holds the authenticated LRS endpoint, in-flight batches, and retry state.

## Entities

- _LmsAdapter_ — per-LMS normalization adapter registered by host fingerprint.
- _CmiApiStub_ — the in-page `window.API` / `window.API_1484_11` exposure that SCORM packages call into (via `scorm-again`).

## Value objects

- *Registration* (cmi5 or SCORM — context-tagged; see [§C.1](../01-ubiquitous-language.md#c1-explicit-collision-resolution--registration))
- *LaunchParameters* — `{endpoint, fetch, actor, registration, activityId}` per cmi5
- *ReturnURL* — cmi5 `returnURL` (Research §3.1, §Flow 6)
- *LaunchMode* — `Normal | Browse | Review`
- *LaunchMethod* — `OwnWindow | AnyWindow`
- *AuthToken* — short-lived bearer token for the LRS proxy
- *StatementBatch* — see [Tracking](./tracking.md)
- *LmsQuirk* — known-deviation descriptor (`{lmsId, behavior, mitigation}`)

## Domain events

- `LaunchInitiated` — cmi5 `launched` received or SCORM `LMSInitialize` called
- `SessionInitialized` — cmi5 `initialized` statement emitted
- `StatementAccepted` — proxy forwarded a Statement to the LRS
- `StatementRejected` — xAPI 2.0 schema validation failed; Statement dropped
- `LaunchTerminated` — `terminated` on `sendBeacon` (Research §4.5)
- `ScormPackageImportedByLms` — SCORM Cloud CI import succeeded (signal back into Packaging)
- `LmsQuirkDetected` — runtime detection of a known deviation

## Application services / use cases

- **HandleCmi5Launch** — parses LaunchParameters, resolves Registration, mints an AuthToken for the LRS proxy.
- **ExposeCmiApi** — mounts `window.API` / `window.API_1484_11` for SCORM-delivered packages (via `scorm-again`).
- **ProxyStatementBatch** — validates each Statement against the xAPI 2.0 JSON schema, forwards to the LRS with server-side credentials.
- **NormalizeLmsQuirk** — applies the registered LmsAdapter for the detected LMS.
- **EmitScormApiEvents** — fires SCORM `LMSInitialize`, `LMSFinish`, `LMSSetValue`, `LMSGetValue`, `LMSCommit` from the runtime.

## Integration with other contexts

- **Upstream — [Tracking](./tracking.md):** ACL — outbound. Tracker Statements flow through StatementProxy.
- **Upstream — [Identity & Tenancy](./identity-tenancy.md):** OHS — the proxy authenticates the learner and mints LRS-bound tokens.
- **Conformist to external specs:** xAPI 2.0, cmi5, SCORM 1.2, SCORM 2004 4th Ed.
- **Downstream — external LRS:** Yet Analytics SQL LRS (primary), Trax (alt) (Research §3.4).
- **Downstream — external LMSes:** Moodle, TalentLMS, Docebo, SCORM Cloud, Cornerstone, etc. (Research §3.3).
- **Downstream — [Learner Progress](./learner-progress.md):** CS — Launch may fetch resume payload on boot.
- **Downstream — [Packaging](./packaging.md):** via `ScormPackageImportedByLms` events from the SCORM-Cloud CI gate.

## Invariants and business rules

1. **cmi5 sequence: `launched → initialized → {interactive}* → terminated`** — `initialized` MUST be the first post-launch statement; `terminated` MUST arrive on `sendBeacon` unload (Research §4.5, §Flow 6).
2. **LRS credentials NEVER reach the browser** — all LRS-bound requests are mediated by the proxy (Research §4.5).
3. **Every xAPI Statement MUST pass JSON-schema validation before egress**; invalid ones emit `StatementRejected` and a WARN log, never reach the LRS (Research §5 ACL).
4. **SCORM 1.2 `LMSFinish` MUST be called before page unload** — tracked-and-retried via `scorm-again`'s commit strategy.
5. **LmsAdapter registry is the only place `LmsQuirk` VOs live** — upstream contexts MUST NOT condition logic on LMS identity directly.
6. **`cmi5.xml` launch URL MAY use fully-qualified origins** — unlike SCORM, cmi5 does not require content to be inside the package (Research §3.1).
7. **SCORM-Cloud CI import is the gate for every release** — if the package fails there, it fails for customers (Research §3.3 operational rule).
8. **TraceId propagation**: statements forwarded to the LRS carry the inbound request's TraceId as an xAPI context extension, enabling end-to-end correlation in Observability.
