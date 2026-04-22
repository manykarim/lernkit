# 08 — Team and RACI

> Team shape, RACI matrix across workstreams, hiring triggers tied to phase gates, and meeting cadence. Cross-references [`01-workstreams-and-dependencies.md`](./01-workstreams-and-dependencies.md), [`02-phase-plan.md`](./02-phase-plan.md) (FTE allocation tables), and [`05-security-model.md`](./05-security-model.md).

> **Scope narrowed 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md).** The Phase 5 security-engineer hire is struck — security rotation stays shared across BE-1 + Many with ad-hoc external engagements (e.g. scorm-again license audit at P0, sandbox review at P3 end). Multi-tenant / billing / marketplace RACI rows are removed. Many's column is updated to reflect the packaging + conformance authority role. Operational posture follows [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md).

## 1. Team shape

### 1.1 Core team at P0 start (2026-04-20)

- **FE-1** — Senior full-stack engineer (1.0 FTE). Specializes in Astro/MDX/TypeScript. Primary accountable for: WS-A Foundation, WS-B Content Model, WS-F In-Browser JS, WS-I Assessment (pre-ID-hire), WS-L UI Authoring, WS-Q Docs.
- **FE-2** — Senior full-stack engineer (1.0 FTE). Specializes in packaging/build-pipeline/test-infrastructure. Primary accountable for: WS-C Tracker, WS-D Packaging, WS-E In-Browser Python, WS-J PDF, WS-R Conformance & QA.
- **Many** — Fractional architect + RF expertise (~0.5 FTE, ~40 FTE-weeks/quarter at that ratio, per research Executive Summary). **RF + packaging + conformance authority; owner of WS-D and WS-R depth; co-owner of WS-H** (updated 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md)). Primary accountable for: WS-H Robot Framework Runner, all RF-related ADRs, rf-mcp-adjacent upstream contributions; co-owner for WS-D and WS-R P5 depth. Consulted on every architecturally significant ADR. Shared security rotation with BE-1.

### 1.2 Hires and their trigger points

| Role | Hire by | Target ramp | Phase started |
|---|---|---|---|
| **BE-1** — FastAPI/runner specialist | 2026-08-31 (4 weeks before P3 kickoff) | full FTE by P3 week 3 | P3 |
| **ACC** — Accessibility specialist | 2026-11-01 (4 weeks before P4 kickoff) | 0.5 FTE by P4 start, full FTE during P4 audit | P4 |
| **ID** — Instructional design / pedagogy advisor | 2026-10-15 (6 weeks before P4 kickoff) | 0.5 FTE retained through P5 | P4 |

> **SEC hire row removed 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md).** Scope no longer demands a dedicated security engineer. The security rotation remains shared across BE-1 + Many; external vendors engaged ad-hoc for targeted reviews (e.g. scorm-again license audit at P0, sandbox review at P3 end).

**Total headcount by phase end:**

- P0 exit (2026-05-11): 2.5 FTE (FE-1, FE-2, Many 0.5)
- P1 exit (2026-07-13): 2.5 FTE
- P2 exit (2026-09-07): 2.5 FTE (+ BE-1 onboarding if hired on schedule)
- P3 exit (2026-11-30): 3.5 FTE (FE-1, FE-2, BE-1, Many 0.5)
- P4 exit (2027-01-25): 4.5 FTE (+ ACC 0.5, ID 0.5)
- P5 exit (2027-04-19): 4.5 FTE (unchanged — scope narrowed 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md); SEC hire dropped)

### 1.3 Hiring triggers — what to look for

- **BE-1 triggered** when: WS-G sandbox work plan stabilized, integration tests require `--privileged` runner, `/exec` traffic projection exceeds 10k/day. Skills: FastAPI, SQLAlchemy 2, Docker + gVisor runsc, OTel instrumentation.
- **ACC triggered** when: widget count exceeds 20 shippable items and WCAG 2.2 AA audit is a phase-3 exit criterion. Skills: WCAG auditor certification (IAAP CPACC or equivalent), VoiceOver + NVDA fluency, axe-core ruleset customization, WAI-ARIA design.
- **ID triggered** when: authoring dashboards (WS-K) require pedagogy judgment — mastery criteria, hint-ladder scoring, scenario-branch validity. Skills: experience with Articulate Rise or Storyline or equivalent; mastery learning / Bloom / xAPI cmi5 statements; course-authoring background.

> **SEC trigger removed 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md).** The P5 exit criteria no longer include enterprise-scale pen-test completion or monetary bug-bounty launch; multi-tenant isolation is out of scope. Security rotation remains shared across BE-1 + Many; external vendors engaged ad-hoc for targeted reviews (e.g. scorm-again license audit at P0, sandbox review at P3 end).

## 2. RACI matrix

**R**esponsible (does the work), **A**ccountable (one person answerable), **C**onsulted (provides input), **I**nformed (kept in the loop).

> SEC column removed 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md); security rotation shared across BE-1 + Many. Billing / Marketplace / Multi-tenant rows are not present (never added), reflecting the scope narrow.

| Workstream | FE-1 | FE-2 | BE-1 | Many | ACC | ID |
|---|---|---|---|---|---|---|
| **WS-A Foundation** | **A** / R | R | I | C | — | — |
| **WS-B Content Model** | **A** / R | C | — | C | C | C |
| **WS-C Tracker** (exhaustive adapters) | C | **A** / R | I | C | — | I |
| **WS-D Packaging** (load-bearing) | I | **A** / R | — | **A** (co-accountable, P5 depth) / R | — | — |
| **WS-E In-Browser Python** | C | **A** / R | — | C | — | — |
| **WS-F In-Browser JS** | **A** / R | C | — | I | — | — |
| **WS-G Server Sandbox** | I | C | **A** / R | C | — | — |
| **WS-H Robot Framework Runner** | I | I | **A** (co-accountable, from P3 onward — BE-1 absorbs RF ops) / R | **A** (co-accountable) / R | — | — |
| **WS-I Assessment** | **A** / R | C | C | — | C | C |
| **WS-J PDF** | I | **A** / R | — | — | C | — |
| **WS-K LRS + Analytics** | C | I | **A** / R | C | — | C |
| **WS-L UI Authoring** | **A** / R | C | — | — | C | C |
| **WS-M Identity** (single-tenant OIDC) | C | I | **A** / R | C | — | — |
| **WS-N Observability** | I | I | **A** / R | C | — | — |
| **WS-O A11y & i18n** | R (pre-hire) | C | I | — | **A** (from P4) | C |
| **WS-P Security** (shared rotation) | C | C | **A** / R | **A** (co-accountable) / R | — | — |
| **WS-Q Docs & DevEd** | **A** / R | R | C | C | C | C |
| **WS-R Conformance & QA** (primary P5 driver) | C | **A** / R | R | **A** (co-accountable, P5 depth) / R | C | — |

Notes on this matrix:

- **Many is Accountable for WS-H** and **co-accountable for WS-D, WS-R, WS-P** (updated 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md) — packaging + conformance + security-rotation authority). Consulted on WS-G, WS-K, WS-M, WS-N. RF-adjacent work always gets Many's sign-off; non-RF-adjacent Many-consulted means Many has veto on ADRs but not on implementation detail.
- **Co-accountable rows** (WS-D, WS-P, WS-R) are the only exceptions to the one-Accountable rule; both sign gates, and a disagreement escalates to a weekly architecture-review decision.
- **Accountable flips explicitly on hire** (e.g. WS-O moves from FE-1 to ACC on 2026-11-01).
- **Every new ADR needs R + A + C signatures** in the frontmatter.

## 3. ADR accountability map

Following ADR 0001's pattern, ADRs carry explicit deciders. The map below assigns accountability for the ADR batch expected through P5:

| ADR | Topic | Accountable |
|---|---|---|
| 0001 | MADR | FE-1 |
| 0002 | Astro + Starlight + MDX + React islands | FE-1 |
| 0003 | SCORM 1.2 default / cmi5 modern / 2004 opt-in / xAPI standalone | FE-2 |
| 0004 | Tracker abstraction with 5 adapters | FE-2 |
| 0005 | Pyodide in Web Worker; Comlink + Coincident | FE-2 |
| 0006 | Sandpack for JS; WebContainers opt-in | FE-1 |
| 0007 | FastAPI + Postgres + Redis stack | BE-1 (Many draft before hire) |
| 0008 | Sandbox hardening checklist | Many + BE-1 |
| 0009 | rf-mcp image as RF runner base | **Many** |
| 0010 | Paged.js + Playwright for PDF | FE-2 |
| 0011 | Keystatic primary / Sveltia fallback | FE-1 |
| 0012 | Yet Analytics SQL LRS | BE-1 (Many draft before hire) |
| 0013 | Coolify on Hetzner | FE-1 + BE-1 |
| 0014 | License allow-list + vendor policy | FE-1 |
| 0015 | CodeMirror 6 default editor | FE-1 |
| 0016 | Markdoc optional path | FE-1 + ID |
| 0017 | ~~RLS-based multi-tenant isolation~~ | ~~BE-1 + SEC~~ — **closed 2026-04-21, superseded by [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md)** (single-tenant substrate; no RLS needed) |
| 0018 | OTel + Grafana + ~~Sentry~~ GlitchTip observability | BE-1 (GlitchTip per [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md)) |
| 0019 | MIT license for core | FE-1 |
| 0021 | Self-host-first infrastructure principle | Many + BE-1 |
| 0022 | OSS single-tenant framework scope | Many |

## 4. Meeting cadence

**Async-first.** Default expectation: decisions documented in ADRs, risks tracked in [`04-risk-register.md`](./04-risk-register.md), progress in GitHub issues. Meetings exist only where live discussion adds signal.

### 4.1 Standing meetings

| Meeting | Cadence | Length | Attendees | Purpose |
|---|---|---|---|---|
| **Weekly architecture review** | Mondays 15:00 UTC | 60 min (strict) | FE-1, FE-2, BE-1 (from P3), Many, rotating invitees | One workstream owner presents the riskiest decision of the week. Outputs: risk-register updates, ADR proposals, phase-gate amendments. |
| **Monthly ADR review** | First Monday of month, 14:00 UTC | 45 min | FE-1, FE-2, BE-1, Many | Every `proposed` ADR older than 14 days: accept / defer / reject. *SEC attendee removed 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md).* |
| **Phase gate review** | End of each phase | 2 h | All core team + Many | Run the exit-gate checklist in [`02-phase-plan.md`](./02-phase-plan.md). Sign or reject. |
| **Quarterly re-plan** | First Monday of quarter | 3 h | All core team + Many | Rewrite [`01-workstreams-and-dependencies.md`](./01-workstreams-and-dependencies.md) delivery matrix based on what shipped. |
| **Security tabletop** | Quarterly from P3 | 2 h | BE-1, Many, rotating DevTeam | Red-team scenario per [`03-test-strategy.md`](./03-test-strategy.md) §10. *SEC attendee removed 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md); external vendor engaged ad-hoc for sandbox reviews at P3 end.* |
| **On-call handoff** | Weekly, Friday 16:00 UTC | 15 min | Outgoing + incoming on-call | Knowledge transfer + open incident review. |

### 4.2 Ad-hoc meetings

- **Incident response** — as needed; paged on-call + incident commander.
- **Pairing / design sessions** — scheduled ad-hoc; goal is to produce an ADR draft, not minutes.
- **Hiring panel** — one per hire; structured loop of tech screen + system design + values + team fit.

### 4.3 Async communication norms

- **GitHub issues** are the system of record for trackable work.
- **PR descriptions** follow a template that includes: intent, bounded context touched, ADR referenced, test coverage, breaking changes.
- **CHANGELOG** entry per user-visible PR is enforced by a bot; `no-changelog` label bypass requires reviewer acknowledgement.
- **Mattermost (self-hosted per [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md))** for discussion; nothing decisional lives only in chat.

## 5. Workload balancing rules

- No single engineer is Accountable for more than three workstreams at once.
- Fractional FTE (e.g. ID 0.5, ACC 0.5 during ramp-up) does not get Accountable status on a workstream without an explicit escalation path to a full-FTE contributor.
- Many's fractional 0.5 FTE is allocated as (updated 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md)): 30% WS-H (RF work) + 25% WS-D and WS-R P5 depth (packaging + conformance authority) + 20% ADR reviews + arch review + 15% upstream rf-mcp coordination + 10% shared security rotation and strategic input on WS-B/G.

## 6. Performance and growth

- **Quarterly 1:1s** between Many and each core engineer — career goals, workstream rotation interest, blockers.
- **Workstream rotation:** ownership of a primary workstream may rotate at phase boundaries with consent; prevents bus-factor calcification (risk R-16).
- **Cross-training rotations:** once per phase, FE-1 and FE-2 swap on a small slice (e.g. FE-1 owns a packaging PR; FE-2 owns a UI PR) to maintain dual-knowledge.

## 7. External engagements

- **Ad-hoc external security reviews** engaged at surface-change points (updated 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md)): scorm-again license audit at P0; sandbox-focused review at P3 end; further reviews triggered by material surface changes post-P5. See [`05-security-model.md`](./05-security-model.md) §7.2.
- **Community support channel** — GitHub Discussions P0–P2, Discourse self-hosted at P3 (per [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md)). Rotating triage duty among FE-1, FE-2, BE-1 from P3.

## 8. Offboarding protocol

- 30-day transition with a written handover doc for every workstream Accountable for.
- Secret rotation triggered within 24 h of departure notice for every secret the departing engineer had access to (per [`05-security-model.md`](./05-security-model.md) §4); rotation executed by the remaining BE-1 + Many security rotation pair.
- Retrospective: every departure triggers a "what made us vulnerable to this person leaving" review feeding risk R-16.

## 9. Diversity and inclusion

- Interview panels always include at least two people.
- Structured scoring rubric per loop stage.
- Candidate feedback loop: every rejected candidate gets at minimum automated signal within 10 business days.
- Sponsorship budget (small team, but deliberate): one conference attendance per engineer per year; one open-source contribution day per quarter.
