---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0019 — Scope cross-origin isolation headers (COOP/COEP) to the code-runner page only

## Context and Problem Statement

Pyodide's synchronous features — `input()` prompts, `KeyboardInterrupt` via `pyodide.setInterruptBuffer`, blocking `time.sleep`, synchronous `FS.syncfs` —
require `SharedArrayBuffer` + `Atomics.wait`. These primitives are gated behind **cross-origin isolation** — the page must be served with:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`)

Setting these headers **site-wide** breaks many third-party embeds in downstream lessons: YouTube, Vimeo, Sandpack's CDN-hosted bundler iframe, H5P content
from external origins, most BI dashboard iframes. This is a severe negative side effect for a training site that regularly embeds external media.

This ADR is called out separately even though ADR 0006 mentions it, because the scoping rule is a policy that affects the entire web tier and many future
authors will be tempted to flip headers on globally "because Pyodide works better".

## Decision Drivers

- **Pyodide sync features are valuable** — especially `input()` in beginner Python lessons and `KeyboardInterrupt` for stuck cells.
- **Third-party embeds are essential** — we cannot ship a training site that breaks YouTube.
- **Per-path header scoping is a well-supported web primitive** — Traefik, Caddy, Nginx, Cloudflare Workers all support per-path response headers.
- **Documented developer behavior** — authors should not need to know about COOP/COEP at all; the runner page routing does it invisibly.

## Considered Options

- **A:** Apply COOP/COEP only to paths under `/run/*` (or equivalent isolated runner path); all other paths ship no isolation headers.
- **B:** Apply COOP/COEP site-wide; force all embeds to be COEP-compliant (either same-origin or respond with `Cross-Origin-Resource-Policy: cross-origin`).
- **C:** No isolation anywhere; accept that Pyodide runs async-only forever.
- **D:** COEP `credentialless` site-wide — less strict than `require-corp`; allows more embeds but still enables SAB.

## Decision Outcome

Chosen option: **A — COOP: same-origin + COEP: require-corp applied only to the code-runner page path (`/run/*` by convention); the rest of the site is
un-isolated.** Pyodide defaults to **Comlink async-only** everywhere (ADR 0006); Coincident + SharedArrayBuffer upgrade is enabled **only** on isolated
runner pages.

### How the framework implements scoped isolation

- The Astro build emits runnable-code cells into iframes whose `src` is `/run/<course>/<lesson>/<cell>`.
- The deployment's reverse proxy (Traefik / Caddy / Nginx) applies COOP + COEP headers to responses under `/run/*`.
- The parent lesson page is **not** isolated; it embeds the runner iframe like any other iframe.
- Third-party embeds on lesson pages (YouTube, Vimeo, Sandpack) work normally because the parent page has no COEP restriction.
- Inside the runner iframe, the worker running Pyodide detects isolation via `crossOriginIsolated` and selects Coincident + SAB; otherwise falls back to
  Comlink async. Components do not branch on this — the `PyRunner` worker abstracts both.

### Reverse proxy configuration (authoritative snippet)

```
# Traefik middleware example (applied to the /run/* router)
[http.middlewares.coop-coep.headers]
  [http.middlewares.coop-coep.headers.customResponseHeaders]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
    Cross-Origin-Resource-Policy = "same-origin"
```

The framework ships this as part of the Coolify / Docker Compose deployment templates (ADR 0018). Customers using a different reverse proxy get equivalent
Caddyfile / Nginx snippets.

### Static asset policy

Assets served to the isolated runner page (Pyodide wasm, stdlib, language files for CodeMirror) must respond with
`Cross-Origin-Resource-Policy: cross-origin` (or `same-origin` if served from the same origin) so COEP: require-corp accepts them. The Astro `public/` serving
configuration sets this for everything under `/static/pyodide/*` and `/static/lernkit/*`.

### What authors see

Authors write `<RunnablePython>` with no awareness of COOP/COEP. The component:

1. Renders a `src="/run/..."` iframe.
2. Inside the iframe, the runner detects isolation.
3. Isolated: `input()`, `KeyboardInterrupt`, blocking `time.sleep` work.
4. Non-isolated (e.g. on a customer's non-proxied dev setup): the cell degrades to Comlink async; `input()` raises a helpful error.

### Consequences

- **Functionality, good:** Pyodide sync features (`input()`, `KeyboardInterrupt`) work on the runner page.
- **Portability, good:** third-party embeds (YouTube, Vimeo, Sandpack, H5P) continue to work on lesson pages because they are not isolated.
- **Security, good:** isolation in the runner iframe narrows Spectre-class side-channel surfaces specifically at the place we execute user-authored code.
- **Security, good:** the runner iframe has its own origin-isolation boundary; a compromised cell cannot reach the parent page's cookies or localStorage.
- **Clarity, bad:** the reverse-proxy configuration is a piece of infra that must be right on every deployment; we ship templates and assert on it in health
  checks.
- **Performance, neutral:** no measurable runtime cost.
- **Testability, good:** an automated check on the deployed environment verifies headers on `/run/*` vs `/lessons/*` behave as designed.

## Pros and Cons of the Options

### A — Per-path scoped isolation — chosen

- Good: keeps sync Pyodide and rich third-party embeds both available.
- Good: standard pattern recommended across the browser engineering community for "need SAB in part of the app".
- Bad: the infra must enforce the scoping — one misconfigured reverse proxy and the site breaks one way or the other.

### B — Site-wide isolation

- Bad: breaks YouTube, Vimeo, many iframe embeds authors rely on.
- Bad: requires every asset to serve COEP-compliant headers; not all third-party CDNs cooperate.

### C — No isolation anywhere

- Good: simplest infra.
- Bad: loses `input()`, `KeyboardInterrupt`, blocking `time.sleep` — a meaningful UX regression for Python lessons.

### D — COEP: credentialless site-wide

- Good: less disruptive than require-corp.
- Bad: still imposes constraints broader than we need and less supported across older embeds.
- Verdict: may be a fallback for the **runner** path if `require-corp` turns out too strict for a specific asset — we evaluate on merit, not site-wide.

## Health checks and enforcement

- **CI asserts headers.** The deployment pipeline runs a `curl`-based check against `/run/health` and `/` (or equivalent) after deploy; fails if `/run/*`
  responses lack COOP/COEP or `/` responses have them unexpectedly.
- **Local dev:** the Astro dev server emits the headers when serving `/run/*` in development too, so the behavior is identical dev-to-prod.
- **Documented in CONTRIBUTING:** a new route under `/run/*` inherits the middleware automatically; authors adding a page outside `/run/*` that needs
  isolation must file an ADR.

## Validation

- **Automated post-deploy test:** `curl -I https://<host>/run/ping` returns `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy:
  require-corp`; `curl -I https://<host>/` does not.
- **In-runner test:** a Pyodide cell under `/run/*` successfully executes `input()`; the same cell under a non-isolated preview URL raises the expected
  fallback error.
- **Regression test:** a test lesson that embeds a YouTube iframe loads successfully on a non-isolated page and fails gracefully on an isolated page (where
  YouTube's CORP headers may not satisfy require-corp).
- **Asset CORP scan:** every asset under `/static/pyodide/*` and `/static/lernkit/*` has a `Cross-Origin-Resource-Policy` header set.

## More Information

- Research §4.1 last paragraph — "Cross origin isolation needs ... set these headers only on the code-runner page, not site-wide, or you break third-party
  embeds."
- Research §10 Risk #5 "Cross-origin isolation trade-off".
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/crossOriginIsolated.
- WebKit / Chromium SAB requirements: https://web.dev/articles/coop-coep.
- Related ADRs: 0006 (Pyodide implementation depends on this policy), 0007 (Sandpack embedding on non-isolated pages), 0016 (H5P iframe on non-isolated
  pages), 0018 (deployment infra that ships the reverse-proxy config).
- Open question: if a future Pyodide release no longer requires SAB for the sync features we care about, relax this ADR and ship a superseding one that
  removes COOP/COEP everywhere.
