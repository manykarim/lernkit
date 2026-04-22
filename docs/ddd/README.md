# Lernkit — DDD Artifacts

Domain-Driven Design (DDD) artifacts for **Lernkit**, a code-first technical-training authoring framework. This directory is strategic + tactical DDD, not implementation — no code, no SQL, no TypeScript. The single source of truth for all claims below is:

> [`../research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md`](../research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md)

Citations "§N" throughout point to that document.

## How to read this directory

1. **[`00-strategic-overview.md`](./00-strategic-overview.md)** — vision, users, subdomain classification, why DDD fits. Read first.
2. **[`01-ubiquitous-language.md`](./01-ubiquitous-language.md)** — the glossary per context. Read second — every other file assumes this vocabulary. Explicitly resolves the classic collisions (Registration, Session, Profile).
3. **[`02-bounded-context-map.md`](./02-bounded-context-map.md)** — Mermaid graph + relationship matrix using classic DDD patterns (SK / CS / CF / ACL / OHS / PL / SW / PS). Read third to see the big picture.
4. **[`03-context-models/`](./03-context-models/)** — one file per bounded context with aggregates, entities, value objects, domain events, use cases, integration, and invariants. Read per-context as you work on that context.
5. **[`04-domain-events-and-flows.md`](./04-domain-events-and-flows.md)** — six canonical end-to-end scenarios with numbered sequences and Mermaid sequence diagrams. Read to see contexts in motion.
6. **[`05-anti-corruption-layers.md`](./05-anti-corruption-layers.md)** — the six ACLs that sit between incompatible contexts. Read when designing or debugging integration.
7. **[`06-quality-attribute-drivers.md`](./06-quality-attribute-drivers.md)** — which context owns which non-functional attribute. Read when triaging incidents or assigning work.

## Most load-bearing artifacts

Ordered by "most likely to be wrong if we don't keep it current":

1. **[`01-ubiquitous-language.md`](./01-ubiquitous-language.md)** — the vocabulary. If this rots, every conversation costs more.
2. **[`02-bounded-context-map.md`](./02-bounded-context-map.md)** — the integration-pattern matrix. New features usually change this.
3. **[`05-anti-corruption-layers.md`](./05-anti-corruption-layers.md)** — the ACLs. These are the places foreign vocabulary tries to leak in.
4. **[`03-context-models/tracking.md`](./03-context-models/tracking.md)** — the `Tracker` abstraction is the architectural keystone unifying five packagers.
5. **[`03-context-models/code-execution.md`](./03-context-models/code-execution.md)** — highest-risk surface (security); the hardening invariants are non-negotiable.

## Conventions

- **Aggregates** in **bold**.
- _Entities_ in _italics_.
- *Value objects* in *italics* (distinguishable from entities by absence of identity).
- `Domain events` in `monospace`, past tense.
- Cross-links between files use relative Markdown paths.
- Mermaid is used where diagrams clarify.
- No emojis.
- "(derived)" flags any inference beyond the research doc.

## Contexts at a glance

| Context | File | Class |
|---|---|---|
| Authoring | [authoring.md](./03-context-models/authoring.md) | Core |
| Content Rendering | [content-rendering.md](./03-context-models/content-rendering.md) | Supporting |
| Code Execution | [code-execution.md](./03-context-models/code-execution.md) | Core |
| Robot Framework Execution | [robot-framework-execution.md](./03-context-models/robot-framework-execution.md) | Core |
| Assessment & Grading | [assessment.md](./03-context-models/assessment.md) | Core |
| Packaging & Export | [packaging.md](./03-context-models/packaging.md) | Core |
| Tracking | [tracking.md](./03-context-models/tracking.md) | Core |
| Learner Progress | [learner-progress.md](./03-context-models/learner-progress.md) | Supporting |
| PDF Rendering | [pdf-rendering.md](./03-context-models/pdf-rendering.md) | Supporting |
| LMS Launch / LRS Gateway | [lms-launch.md](./03-context-models/lms-launch.md) | Supporting |
| Authoring UI | [authoring-ui.md](./03-context-models/authoring-ui.md) | Supporting |
| Identity & Tenancy | [identity-tenancy.md](./03-context-models/identity-tenancy.md) | Generic |

## Adding a new bounded context

When adding a new context:

1. Decide its subdomain class (core / supporting / generic) by asking "does this differentiate us or is it commoditizable?". Record the rationale in [`00-strategic-overview.md`](./00-strategic-overview.md) §4.
2. Draft its section in [`01-ubiquitous-language.md`](./01-ubiquitous-language.md) before touching anything else — naming drives model quality.
3. Create `03-context-models/<name>.md` following the structure of the existing models: Purpose / Aggregates / Entities / Value Objects / Domain Events / Application Services / Integration / Invariants.
4. Update [`02-bounded-context-map.md`](./02-bounded-context-map.md): add the Mermaid node, add the row+column to the relationship matrix, state the relationship pattern explicitly.
5. If the new context speaks a foreign vocabulary to an existing context, design the ACL in [`05-anti-corruption-layers.md`](./05-anti-corruption-layers.md).
6. Add at least one representative flow in [`04-domain-events-and-flows.md`](./04-domain-events-and-flows.md) if the context is on a user-visible path.
7. Assign quality-attribute accountability in [`06-quality-attribute-drivers.md`](./06-quality-attribute-drivers.md).

## What is NOT here

- No TypeScript interfaces, SQL schemas, Python code, OpenAPI specs, YAML configs, or Dockerfile snippets. That work lives in the implementation tree and in [`../adr/`](../adr/).
- No implementation-detail diagrams (deployment topology, Docker-compose graphs). See [`../plan/`](../plan/) for phased-plan work.
- No quantitative SLOs. They belong to the observability / SRE docs when that discipline materializes.
