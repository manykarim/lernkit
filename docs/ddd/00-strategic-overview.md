# 00 — Strategic Overview

> Strategic DDD framing for **Lernkit**, a code-first technical-training authoring framework.
> Primary source: [`compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md`](../research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md) (cited as "Research §N" below).

## 1. Vision

Lernkit is an opinionated, greenfield framework for authoring technical-training courses where **runnable code in lessons is a first-class primitive**. Authors write MDX; the build pipeline emits a single static site and five distribution artifacts (SCORM 1.2, SCORM 2004 4th Ed, cmi5, xAPI bundle, plain HTML) plus a print-quality PDF (Research §Executive Summary, §3.5).

The product sits in a category-defining gap: no surveyed commercial tool ships executable code in lessons, and the nearest open-source sibling (LiaScript) is unforkable for the MDX/React/Astro stack (Research §1.1, §9).

## 2. Business goals

1. **Author DX parity with Articulate Rise** — match the Tier 1/Tier 2 interaction vocabulary (~25 item types) so instructional-design teams can migrate without retraining (Research §1.1, §1.4).
2. **Runnable code supremacy** — Pyodide-in-browser Python, Sandpack-in-browser JS, gVisor-isolated server-side runners, and Robot Framework via [`rf-mcp`](https://github.com/manykarim/rf-mcp) (Research §4, §10.3).
3. **LMS portability without lock-in** — single `Tracker` abstraction behind five packaging adapters so every course survives import into Moodle, TalentLMS, Docebo, Cornerstone, SCORM Cloud (Research §3.1–§3.3).
4. **Self-hostable on a single Hetzner box** — Docker Compose dev, Coolify prod; no cloud-lock-in dependencies (Research §7, §4.6).
5. **Analytics ownership** — customer-controlled xAPI data in a self-hosted Yet Analytics SQL LRS (Research §3.4).

## 3. Target users

| User | Primary concern | Dominant language |
|---|---|---|
| **Learner** | Read lesson, run code, pass challenge, resume later. | Lesson, Attempt, Score, Bookmark |
| **Author (developer)** | Write MDX, compose runnable widgets, validate build. | Module, Lesson, Component, Frontmatter |
| **Instructional Designer** | Author-safe content, quiz structure, scenario branching. | Objective, Quiz, Scenario, MasteryCriterion |
| **LMS Admin** | Import SCORM/cmi5 package; see completion data. | Package, Manifest, Registration, Completion |
| **Tenant Admin** | SSO, roles, per-org isolation, billing. | Tenant, Workspace, Role, Identity |
| **Platform Operator** | Sandbox health, LRS ingest, cost per execution. | Runner, Quota, Sandbox, StatementBatch |

## 4. Strategic subdomain classification

Subdomains are classified by competitive differentiation, not by engineering effort. A core subdomain is where Lernkit *must* beat competitors; supporting is necessary-but-commoditizable-later; generic is solved by off-the-shelf infra.

### 4.1 Core subdomains (competitive differentiators)

| Subdomain | Why core | Research anchor |
|---|---|---|
| **Authoring** | MDX-as-source-of-truth is the whole product thesis; every other context is downstream. | §2, §6 |
| **Code Execution** | No commercial tool ships runnable code in lessons — this is the market whitespace. | §1.1, §4 |
| **Robot Framework Execution** | Direct synergy with Many's existing `rf-mcp` asset; nobody else can match this. | §4.4, §10.3 |
| **Assessment & Grading** | Test-driven code challenges + xAPI per-test breakdown is a novel combination. | §4.5, §6.6 |
| **Packaging & Export** | Five output formats from one source is the portability story. | §3.5 |
| **Tracking** | The single `Tracker` abstraction is the architectural keystone that unifies the five packagers. | §3.5 |

### 4.2 Supporting subdomains

| Subdomain | Why supporting |
|---|---|
| **Content Rendering** | Astro + Starlight provides most of it; our value-add is the island widget set. |
| **Learner Progress** | Essential, but non-differentiating — enrollment, resume, bookmarks. |
| **Authoring UI** | Keystatic/Sveltia solve this; we only configure schemas. |
| **PDF Rendering** | Paged.js + Playwright is a known recipe (Research §5). |
| **LMS Launch / LRS Gateway** | Spec-compliance work — valuable but commoditizable once done. |

### 4.3 Generic subdomains

| Subdomain | Chosen implementation |
|---|---|
| **Identity & Tenancy** | OIDC SSO (Keycloak/Azure AD/Okta); row-level security in Postgres (Research §8 Phase 5). |
| **Observability** | OpenTelemetry + Grafana Loki/Tempo + Sentry (Research §7). |
| **Billing** | Stripe (Phase 5) (Research §8 Phase 5). |

## 5. Executive summary of the bounded-context map

Each bounded context has a distinct ubiquitous language, aggregate cluster, and release cadence. The authoritative map with relationships is in [`02-bounded-context-map.md`](./02-bounded-context-map.md).

Core contexts:

- [Authoring](./03-context-models/authoring.md)
- [Content Rendering](./03-context-models/content-rendering.md)
- [Code Execution](./03-context-models/code-execution.md)
- [Robot Framework Execution](./03-context-models/robot-framework-execution.md)
- [Assessment & Grading](./03-context-models/assessment.md)
- [Packaging & Export](./03-context-models/packaging.md)
- [Tracking](./03-context-models/tracking.md)

Supporting contexts:

- [Learner Progress](./03-context-models/learner-progress.md)
- [PDF Rendering](./03-context-models/pdf-rendering.md)
- [LMS Launch / LRS Gateway](./03-context-models/lms-launch.md)
- [Authoring UI](./03-context-models/authoring-ui.md)

Generic contexts:

- [Identity & Tenancy](./03-context-models/identity-tenancy.md)

## 6. Why DDD fits here

Lernkit sits on a junction of at least five industry vocabularies that *use the same words to mean incompatible things*. Without explicit bounded contexts the model collapses:

1. **Authoring DSL** — `Lesson`, `Module`, `Section`, `Component`, `Frontmatter`. MDX-native, pedagogy-flavored.
2. **LMS/SCORM jargon** — `lesson_status`, `suspend_data`, `cmi.core.score.raw`, `imsmanifest.xml`, `Activity`. Iframe-bound JS API, 4 KB caps (Research §3.2).
3. **xAPI/cmi5 spec language** — `Statement`, `Actor`, `Verb`, `Activity`, `Registration`, `Session`, `AU`, `moveOn`. REST/JSON, globally unique IRIs (Research §3.1).
4. **Container-runtime language** — `Runner`, `Sandbox`, `Image`, `seccomp`, `gVisor`, `WarmPool`, `Quota`. Ops-flavored (Research §4.3).
5. **Pedagogy language** — `Objective`, `MasteryCriterion`, `Prerequisite`, `Attempt`, `Hint`. Draws from Bloom, mastery learning, hint-ladder scoring (Research §1.3).

Three language collisions in particular would silently corrupt the model if allowed to leak:

- **Registration** — cmi5 registration is a UUID scoping an AU launch within a session; SCORM "registration" is a learner-course enrollment record; OIDC/IAM registration is user account creation. Resolved in [§1 Ubiquitous Language](./01-ubiquitous-language.md).
- **Session** — xAPI Session is a context extension grouping statements; HTTP session is a cookie-bound auth span; SCORM session is a `cmi.core.session_time` accumulator.
- **Profile** — cmi5 profile is an xAPI profile (statement shape constraints); rf-mcp profile is a tool-exposure policy (which MCP tools are callable); seccomp profile is a syscall filter.

DDD gives us:

1. **Bounded contexts** (per [§2](./02-bounded-context-map.md)) that own their own terminology.
2. **Anti-corruption layers** (per [§5](./05-anti-corruption-layers.md)) between contexts that force translation — SCORM's 4 KB cap never leaks into Authoring's `<CodeChallenge>` component author API.
3. **Ubiquitous language per context** (per [§1](./01-ubiquitous-language.md)) so code, docs, and conversations all pick the same word for the same thing within a context.
4. **Domain events** (per [§4](./04-domain-events-and-flows.md)) as the integration contract between contexts — `LessonPublished`, `CodeExecuted`, `AttemptGraded`, `StatementEmitted`, `PackageBuilt`.

## 7. How to navigate this directory

1. Read this file.
2. Read [`01-ubiquitous-language.md`](./01-ubiquitous-language.md) to ground all terminology.
3. Read [`02-bounded-context-map.md`](./02-bounded-context-map.md) to see how contexts relate.
4. Dip into [`03-context-models/`](./03-context-models/) per-context as needed.
5. Read [`04-domain-events-and-flows.md`](./04-domain-events-and-flows.md) to see the contexts in motion.
6. Read [`05-anti-corruption-layers.md`](./05-anti-corruption-layers.md) when designing integration between contexts.
7. Read [`06-quality-attribute-drivers.md`](./06-quality-attribute-drivers.md) to see which context owns each non-functional concern.
