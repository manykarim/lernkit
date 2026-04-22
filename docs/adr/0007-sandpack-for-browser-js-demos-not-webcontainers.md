---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0007 — Use Sandpack for browser JS demos; defer WebContainers to a paid tier

## Context and Problem Statement

JavaScript / TypeScript lessons have two distinct needs:

1. **Component demos** — a React, Vue, or Svelte component that the learner can edit and see rerender inline. No Node runtime needed; browser bundling is
   sufficient.
2. **Full Node.js demos** — npm install, a dev server, a shell, multi-package monorepos. This is the StackBlitz WebContainers use case.

We need a default for both needs that does not require a server round-trip for the common case, does not depend on a third-party CDN at runtime, and does not
impose commercial licensing on the framework's default operation.

## Decision Drivers

- **Commercial licensing of WebContainers.** StackBlitz offers WebContainers for public/community sites free via an API key tied to origin. **Production
  commercial use (closed networks, enterprise SSO, private LMS deployments) requires a sales-gated enterprise license — industry estimates low-to-mid 5
  figures per year** (research §4.2 and §10 Risk #4). This is a disqualifier for the default tier of an open-source framework.
- **Sandpack is Apache 2.0.** CodeSandbox's Sandpack ships as a React library, bundles projects in the browser via a bundler iframe, supports multi-file
  templates (React, Vue, Svelte, Vanilla), and is free for all use.
- **Inline snippet execution.** Plain JS snippets can run in a sandboxed iframe with `new Function` — zero dependencies, `sandbox="allow-scripts"` without
  `allow-same-origin`.
- **Full-stack Node is rare in a training context.** Most training lessons need a React component demo, not a full Next.js dev server. The exceptions
  (Node/backend courses) are a tiny minority and justifiable as a paid tier.
- **Server fallback always exists.** Anything Sandpack/iframe cannot do can always run through the FastAPI sandbox (ADR 0008).

## Considered Options

- **A:** Sandpack for component demos + sandboxed iframe for snippets (default). WebContainers as a customer-licensed tier.
- **B:** WebContainers for everything JS — pay the licensing cost as core framework.
- **C:** Only the sandboxed iframe — no Sandpack.
- **D:** Everything JS runs server-side via FastAPI sandbox.

## Decision Outcome

Chosen option: **A — Sandpack for component demos + sandboxed iframe for plain snippets at the default tier. WebContainers is supported as an opt-in paid
tier requiring the customer to provide their own StackBlitz enterprise license.**

### Component behaviors

- `<RunnableJS mode="sandpack" template="react" ...>` — mounts a Sandpack instance with the given template; supports multi-file, external dependencies from
  npm (resolved by Sandpack's bundler service).
- `<RunnableJS mode="iframe" code="..." />` — mounts a `sandbox="allow-scripts"` iframe (no `allow-same-origin`), runs the code, pipes stdout to the host
  via `postMessage`. Zero dependencies.
- `<RunnableJS mode="webcontainer" ...>` — only available when a WebContainer license key is present in the build configuration. The packager refuses to
  emit this mode without an explicit customer-provided license.
- **Server fallback** via `<Runnable>` + `backend="server"` for anything the above cannot do.

### Consequences

- **Functionality, good:** React/Vue/Svelte demos work instantly; plain-JS lessons have a zero-dep option.
- **Portability, good:** Sandpack runs entirely in the browser; works inside SCORM packages (same static-site constraints as everything else in ADR 0002).
- **Cost, good:** zero incremental licensing cost at the default tier.
- **Security, good:** sandboxed iframe without `allow-same-origin` is a well-understood browser isolation primitive. Sandpack's bundler iframe is hosted on
  a dedicated origin.
- **Security, note:** Sandpack by default loads its bundler iframe from a CodeSandbox-hosted origin. For strict-network LMS customers we self-host the
  Sandpack bundler (the CodeSandbox team publishes instructions); the `<RunnableJS>` component reads the bundler URL from config so enterprise self-host is
  one line of configuration.
- **Functionality, bad:** no `npm install` at the default tier; full Node courses need the paid WebContainers tier or the server runner.
- **Clarity, good:** one component (`<RunnableJS>`) with a `mode` prop, documented defaults, explicit opt-in for WebContainers.

## Pros and Cons of the Options

### A — Sandpack + iframe default, WebContainers paid

- Good: zero licensing cost at the default tier.
- Good: covers the dominant lesson shape (component demo) cleanly.
- Good: fall-through to server runner keeps the "advanced Node" case possible without commercial entanglement.
- Bad: full-stack Node-based courses (Next.js dev server, Fastify) need either the paid tier or server-runner UX that is not as snappy.

### B — WebContainers in the core

- Good: best UX for Node courses out of the box.
- Bad: 5-figure/year minimum license cost imposed on every framework operator — disqualifying for an open-source default.
- Bad: ties the core to a single commercial vendor.

### C — Iframe only

- Good: minimal.
- Bad: no React/Vue/Svelte component demo UX — the dominant JS lesson shape in a training context.
- Bad: multi-file demos require a bundler anyway; reinventing Sandpack is wasteful.

### D — Everything server-side

- Bad: every JS cell is a round-trip; freezes interactive feel.
- Bad: SCORM-offline courses (a primary use case) cannot reach a server at runtime.
- Verdict: server is the fallback, not the default.

## WebContainers opt-in mechanics

When a customer has a StackBlitz enterprise license:

1. They drop their license key into `astro.config.mjs` under `lernkit.webcontainers.licenseKey`.
2. The framework's `<RunnableJS mode="webcontainer">` component becomes available.
3. The packager refuses to build if `mode="webcontainer"` is used without a valid license key.
4. The packager warns (does not fail) if WebContainers are used in a SCORM target — the zip will depend on StackBlitz CDN reachability from inside the
   LMS iframe, which many enterprise networks block.

## Validation

- **Build refuses to package a course using `mode="webcontainer"` without a license key** — unit test.
- **Sandpack component demo** renders and reacts to edits in <1s on the sample course's "React Hooks" lesson.
- **Iframe snippet** cannot access the parent origin — Playwright test attempts `window.parent.document` and asserts it throws.
- **Bundler origin configurable** — integration test overrides the Sandpack bundler URL and verifies it is respected.

## More Information

- Research §4.2 "JavaScript/TypeScript — decision matrix".
- Research §10 Risk #4 "WebContainers commercial licensing".
- Sandpack docs: https://sandpack.codesandbox.io/.
- StackBlitz WebContainers licensing: https://webcontainers.io/.
- Related ADRs: 0006 (Pyodide for Python), 0008 (server-side sandbox), 0020 (explicit deferrals including WebContainers as paid tier).
- Open question: if StackBlitz releases WebContainers under a permissive open-source license (unlikely), re-evaluate promoting it to default.
