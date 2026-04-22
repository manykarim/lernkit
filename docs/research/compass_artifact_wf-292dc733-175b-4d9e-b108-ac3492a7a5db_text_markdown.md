# A code-first authoring framework for technical training

## Executive summary and the bottom line

**Build a greenfield framework on Astro + Starlight + MDX + React islands, with a FastAPI backend for runnable code and Robot Framework execution, packaging courses as static HTML that is wrapped at build time into SCORM 1.2, SCORM 2004 4th Ed, cmi5, and xAPI-enabled outputs.** No existing open-source project meaningfully covers this scope — LiaScript is the closest conceptual sibling but is Elm+custom-Markdown and unforkable for MDX. Commercial incumbents (Articulate, iSpring, Captivate, Lectora) have converged on a ~25-item interaction vocabulary but none of them support executable code in lessons, which is the market whitespace a technical-training framework should occupy. The recommended stack is deliberately small and self-hostable on Hetzner/Coolify, leans on three mature libraries (`scorm-again`, `@xapi/cmi5`, Pyodide), and produces book-quality PDFs via Paged.js + headless Chromium. A 9–12 month phased plan reaches production with a realistic team of two to three engineers.

This document is opinionated where justified. Where it hedges, it says so explicitly.

---

## 1. What the market looks like and what we have to beat

Eleven commercial authoring tools were surveyed (Articulate Storyline 360, Rise 360, EasyGenerator, Adobe Captivate new + classic, iSpring Suite, Lectora, Elucidat, dominKnow ONE, Gomo, Evolve), plus a dozen code-focused learning platforms (Educative, Scrimba, Exercism, Codecademy, DataCamp, freeCodeCamp, Hyperskill, Khan Academy, Pluralsight Hands-On Labs, Coursera, SoloLearn, LearnPython.org).

### 1.1 Commercial authoring tools — the consensus baseline

Every modern corporate authoring tool supports SCORM 1.2, SCORM 2004, and xAPI. cmi5 support is growing fast (Articulate 360, Lectora, iSpring, Adobe Captivate, dominKnow) but not yet universal. **Not a single tool in this set ships executable code in lessons** — code snippet blocks are decorative in Rise, and JavaScript execution in Storyline/Captivate/Lectora is author-level scripting, not learner-level code running. This is the category-defining gap the framework should target.

Across all tools, a stable interaction vocabulary has emerged. Any new framework that does not match it will look primitive to instructional designers. The **Tier 1 universal baseline** is: MCQ, multiple-response, true/false, fill-in-the-blank, matching, sequencing, drag-and-drop (including many-to-one bucket drops), hotspot, accordion, tabs, flip/flashcards, labeled graphic (pins on image), process/stepper, timeline, image gallery, video with captions, audio, statement/callout, list, attachment, ungraded knowledge check, graded quiz, scenario/branching decision, variables with conditional display, and bookmarking/resume. **Tier 2** adds charts, slider inputs, interactive/branching video, dialogue simulation, software simulation (Show/Try/Test), 360° hotspots, question banks, custom HTML/JS embed, character/avatar libraries, responsive preview, themes, and collaborative review. **Tier 3** differentiators worth considering are scenario-as-first-class-block, gamification, confidence sliders, social polls, trickle/gating, live content updates without re-upload (Elucidat Rapid Release, dominKnow Convey, Gomo Delivery, Intellum Cloud Sync), and AI features.

Articulate Rise's block catalog and Storyline's interactive-object set remain the most-copied anchors in the industry — naming and behavior parity with them will minimize onboarding friction for ID teams migrating in.

| Tool | SCORM 1.2/2004 | xAPI/cmi5 | Responsive | Code exec | Dialog sim | Variables | Signature |
|------|----|----|----|----|----|----|-----------|
| Storyline 360 | ✅/✅ | ✅/✅ | ⚠️ scalable | ⚠️ JS trigger | manual | deep | Dials, freeform drag-drop, 360° |
| Rise 360 | ✅/✅ | ✅/✅ | ✅ fluid | ❌ | Scenario block | ❌ | Block catalog — industry anchor |
| iSpring Suite | ✅/✅ | ✅/✅ | ⚠️ adaptive | ❌ | ✅ TalkMaster | limited | PPT integration, TalkMaster |
| Lectora | ✅/✅ | ✅/✅ | ✅ breakpoints | ✅ full JS | via vars | deepest | Variables/actions, accessibility |
| Captivate (new) | ✅/✅ | ✅/✅ | ✅ blocks | ⚠️ JS action | characters | ✅ | PPT import, device blocks |
| Captivate Classic | ✅/✅ | ✅/✅ | ✅ Fluid Boxes | ✅ JS/widgets | ⚠️ | ✅ full scripting | Software sim (Demo/Try/Test), VR |
| Elucidat | ✅/✅ | ✅/⚠️ | ✅ 4 views | ⚠️ HTML block | branching video | ✅ | Master courses, Rapid Release |
| dominKnow ONE | ✅/✅ | **✅ best xAPI**/✅ | ✅ Flow | ⚠️ triggers | Scenario | ✅ | Capture (Show/Try/Guide/Test), LCMS |
| Gomo | ✅/✅ | ✅/⚠️ | ✅ adaptive | ❌ | ❌ | ✅ | xAPI dashboard, Gomo Delivery |
| Evolve (Intellum) | ✅/✅ | ✅/⚠️ | ✅ (Adapt-based) | ⚠️ JS ext | ❌ | limited | Branching video questions, Trickle |
| EasyGenerator | ✅/✅ | ✅/⚠️ | ✅ | ❌ | ✅ EasyCoach AI | ❌ | AI course gen, voice roleplay |

### 1.2 Open-source inventory — H5P is the reference, Adapt is the SCORM plumbing

**H5P** ships ~55 content libraries under MIT (core; some types GPL). The full catalog is the single most important reference document for "what interactions exist": Interactive Video, Course Presentation, Branching Scenario, Interactive Book, Virtual Tour (360), Column, Accordion, Agamotto, Image Juxtaposition, Image Slider, Image Hotspots, Find the Hotspot, Find Multiple Hotspots, Image Sequencing, Image Pairing, Image Choice, Collage, Multiple Choice, Single Choice Set, True/False, Question Set, Fill in the Blanks, Advanced Fill the Blanks, Drag Text, Drag and Drop, Mark the Words, Find the Words, Sort the Paragraphs, Arithmetic Quiz, Essay, Dictation, Speak the Words, Audio Recorder, Summary, Questionnaire, Personality Quiz, Dialog Cards, Flashcards, Guess the Answer, Memory Game, Crossword, Game Map, Timeline, Chart, Documentation Tool, KewAr Code, Iframe Embedder, Shape, plus standalone Image/Audio/Link/Table. Every interactive type emits xAPI via H5P's `EventDispatcher` pattern. The **h5p-standalone** library (MIT, tunapanda/h5p-standalone) renders `.h5p` packages in any HTML page without a CMS — meaning **H5P content can be embedded inside MDX lessons as an iframe or React wrapper component** rather than reimplemented. This is the right strategy for long-tail content types.

**Adapt Framework** (GPL v2) is the most important reference for SCORM packaging. Its Spoor extension handles SCORM 1.2/2004 + xAPI output cleanly. Components include Text, Graphic, Narrative, Hotgraphic, Accordion, Media, MCQ, GMCQ (graphical), Matching, Slider, Text Input. Extensions include Assessment, Trickle, Tutor, Bookmarking, Page Level Progress, Resources, Language Picker. GPL is a non-starter for forking as the base, but the Spoor source is required reading when implementing the tracking layer.

**Xerte** (Apereo, GPL) ships ~70 page templates with strong accessibility. **Open edX XBlocks** (AGPL) are server-rendered Python components — wrong shape for a static-site framework. **Moodle question types** (MCQ, TF, matching, short answer, numeric, calculated, calculated multichoice, cloze, drag-drop-image, drag-drop-text, drag-drop-markers, select-missing-words, description, random, plus STACK for CAS math and **CodeRunner** for sandboxed code grading) are a useful taxonomy for the quiz component API.

### 1.3 Code-focused learning platforms — the UX blueprints to steal

Two platforms stand out and should explicitly shape the framework's flagship UX:

**Educative.io** is the reference for "text-first courses with runnable code inline." Their **Code Widget** is the defining primitive: embedded in Markdown-ish prose, multi-file, server-executed in Docker containers across 30+ languages, supports stdin, treats output as HTML, allows tarball upload for large dependencies, has primary-file markers and line highlighting. This is the single most important UX pattern to replicate — it is the thing the framework must nail.

**Scrimba** invented "interactive screencasts." The player *is* the IDE — the recorded content is an event stream of editor keystrokes + audio, not pixels. At any timestamp, the learner pauses, edits the teacher's code directly, runs it, forks the scrim, then resumes. Tiny file sizes, searchable, copy-pastable. This is the #1 differentiating UX in code-focused learning and is worth building as a future phase feature.

The rest: **Codecademy** established the three-pane layout (instructions | editor | terminal); **DataCamp** alternates 2-min video with 3-min code exercise; **freeCodeCamp** popularized test-driven challenges (hidden Mocha asserts, green/red per user story); **Exercism** is local-CLI with human mentoring; **Hyperskill** uses a JetBrains IDE plugin for real projects; **Khan Academy** originated mastery levels, energy points, and the hint ladder that degrades score.

### 1.4 The top 15 patterns the framework must ship out of the box

In priority order: runnable code block (polyglot, multi-file, server-executed, stdin-capable — the Educative pattern); test-graded code challenge; terminal/shell widget; interactive screencast (Scrimba-style, as a phase 4 feature); three-pane lab layout (instructions + editor + output); progressive reveal / trickle; semantic callout/admonition block; toggle/"reveal solution"; MCQ + single choice set + true/false with xAPI emit; fill-in-the-blanks / cloze / mark-the-words; drag-and-drop ordering / matching; diagram/SVG with hotspots; flashcard deck with typing-to-check; interactive video with timestamped questions; scenario/branching container as a multi-stage project.

---

## 2. Foundation evaluation: Starlight wins

### 2.1 The short answer

**Build on Astro + Starlight, with MDX as the primary authoring format.** Fall back to bare Astro + MDX only if Starlight's docs-theme chrome fights the learning UI. Do not use Docusaurus, Nextra, Fumadocs, VitePress, or Gatsby.

### 2.2 Why, ranked

**Starlight (Astro) — primary recommendation.** Astro's islands architecture produces the smallest self-contained HTML+JS payload of any modern MDX framework. This matters enormously for SCORM: a SCORM package ships a full static site inside a zip, loaded in an LMS iframe with no external server; every kilobyte of React runtime is paid by every learner launch. Starlight's Pagefind integration gives static search that works *inside* a SCORM package with no Algolia dependency — the only framework where this works trivially. Content collections with Zod schemas give clean per-course metadata, ordering, i18n. Expressive Code (Shiki-based) ships with copy buttons, titles, diffs built in. Plugin API (`config:setup`, `i18n:setup`) and explicit component overrides give extension points without forking. React islands via `@astrojs/react` are first-class — mix React/Vue/Svelte/Solid interactive widgets in one MDX file. MIT, Astro-team backed, long-term stable.

**Bare Astro + MDX — fallback.** Choose when the training UX diverges dramatically from a docs layout (card-based course catalog, progress dashboards, enrollment flows) or when the SCORM post-build pipeline needs deep control Starlight's theme fights.

**Fumadocs (Next.js) — rejected.** Best MDX DX among all surveyed (Twoslash, `<include>`, OpenAPI, type-safe content layer via Fumadocs MDX). But: ships heavier bundles than Astro, single-maintainer risk (fuma-nama), rapid breaking changes (v14→v16 in months), and diverges from the stated Astro preference. Revisit if Fumadocs MDX becomes framework-agnostic.

**Docusaurus 3 — rejected.** Safe and Meta-backed, but full-hydration SPA is the worst option for SCORM payload size; Infima CSS is tightly coupled (hard to use Tailwind/shadcn); Webpack is slow.

**Nextra, VitePress, Gatsby — rejected.** Nextra's App Router static export has caveats and heavy bundles; VitePress is Vue (wrong ecosystem); Gatsby is effectively abandoned post-Netlify acquisition.

### 2.3 Optional UI authoring layer: Keystatic (primary) or Sveltia CMS (fallback)

The user wants content-as-code first with a lightweight UI editor as secondary. **Keystatic (Thinkmill, MIT)** is the recommendation: Astro docs officially recommend it; it generates the exact `src/content/` files Astro content collections already read; no DB; TypeScript-first schema API with first-class MDX, Markdown, Markdoc, YAML, JSON; dual-mode (local filesystem for developers, GitHub PR-based for editors); free Keystatic Cloud up to three users. Self-hosts trivially on Hetzner/Coolify as part of the Astro app.

**Sveltia CMS (MIT)** is the drop-in fallback if Keystatic's maintenance cadence stalls (some community sources flag it). Sveltia is config-compatible with Decap/Netlify CMS, 5× smaller bundle, actively maintained, pure-static JS admin panel that talks to GitHub. Use when editors need a standalone admin UI decoupled from the site framework.

**TinaCMS, Payload, Decap, Sanity, Outstatic, Contentlayer — rejected.** Tina's DB+function requirement adds unjustified ops weight; Payload is DB-first against the grain; Decap is in maintenance mode; Sanity is not Git-backed; Outstatic is Next-only; Contentlayer is abandoned.

**Bonus pattern:** consider Markdoc (Stripe, MIT) for author-edited content with static tag validation, reserving full MDX for developer-authored components. Starlight supports both formats side by side. This gives safer AI-generated content and catches typos at build time.

---

## 3. Standards and export architecture

### 3.1 Which standards to emit and why

**Default course export: cmi5 package + SCORM 1.2 fallback, with SCORM 2004 4th Edition as opt-in and raw xAPI as a standalone config.** Drop SCORM 2004 2nd/3rd Editions as explicit outputs (a 4th Ed package usually works in 3rd Ed LMSes with a `schemaversion` string swap).

Rationale: **SCORM 1.2 is universally supported** and accounts for ~86% of real-world package exports (per ScormHero). **cmi5** is the right modern choice — it's an xAPI profile designed for LMS-launch, uses REST/JSON instead of iframe-bound JS API finding, works on mobile/native/offline, lets content live anywhere via fully-qualified URLs, and is increasingly supported (Docebo, TalentLMS, SCORM Cloud, Rustici Engine, Trax, Watershed). **SCORM 2004 4th Edition** is offered only for customers who truly need sequencing or separate pass/completion reporting; its value is narrow and LMS behavior is inconsistent.

### 3.2 Critical standards facts engineers will trip on

SCORM 1.2's `cmi.suspend_data` is **4,096 characters max** — SCORM 2004 raises this to 64,000. SCORM 1.2 uses a single `lesson_status` (writing "passed" erases "completed"); 2004 separates `cmi.completion_status` from `cmi.success_status`. SCORM 1.2 `session_time` is `HH:MM:SS.SS`, not ISO 8601; 2004 uses ISO 8601 duration. The `imsmanifest.xml` **must be at the zip root** (the #1 import-failure cause on macOS); never include `__MACOSX/` or `.DS_Store`. xAPI activity IDs must be stable IRIs — changing them between re-publishes fragments learner history.

### 3.3 LMS compatibility test matrix

| LMS | SCORM 1.2 | 2004 4th | xAPI | cmi5 | Notes |
|-----|-----------|----------|------|------|-------|
| Moodle | ✅ | ❌ incomplete | ✅ plugin | ✅ plugin | No Simple Sequencing/Navigation natively |
| SAP SuccessFactors | ✅ | ✅ (not 3rd!) | ⚠️ | ⚠️ | Cannot replace 1.2 with 2004 package (KB 2320891) |
| Cornerstone | ✅ | ⚠️ | ⚠️ | ⚠️ growing | Interactions received but not persisted |
| TalentLMS | ✅ | ❌ | ✅ | ✅ | **SCORM 1.2 only** |
| Docebo | ✅ | ✅ | ✅ | ✅ | Best cmi5 pilot target |
| iSpring Learn | ✅ | ✅ | ✅ | ⚠️ | Good 2004 |
| SCORM Cloud | ✅ reference | ✅ | ✅ | ✅ | CI conformance gate |
| Canvas/edX | weak native | — | LTI | — | Deliver via LTI+Rustici |

**Operational rule: test every released package in the free tier of SCORM Cloud before shipping.** It is the de-facto conformance reference; if it fails there, it's your package. Automate this in CI via the SCORM Cloud REST API.

### 3.4 Tooling choices

| Library | Standards | License | Verdict |
|---------|-----------|---------|---------|
| **scorm-again** (jcputney) | SCORM 1.2, 2004, AICC, full 2004 sequencing in v3 | LGPL-3/MIT mixed — verify | **Primary runtime wrapper** |
| **@xapi/xapi** | xAPI 1.0.3, 2.0 | Apache 2.0 | **Primary xAPI wrapper** |
| **@xapi/cmi5** | cmi5 | Apache 2.0 | **Primary cmi5 wrapper** |
| simple-scorm-packager (lmihaidaniel) | 1.2, 2004 3rd/4th zip | MIT | Use as packaging dependency or fork |
| TinCanJS | xAPI 0.9–1.0.0 | Apache 2.0 | ❌ abandoned, no 1.0.3/2.0 |
| pipwerks wrapper | 1.2, 2004 | MIT | legacy fallback only |
| Rustici SCORM Engine | all | Commercial | Enterprise customer option |
| SCORM Cloud | all | Commercial SaaS | **Required for QA** (free tier works for CI) |

**Self-hosted LRS recommendation: Yet Analytics SQL LRS** (Apache 2.0, Clojure+Postgres, xAPI 2.0/IEEE 9274.1.1 conformant, single Docker image, trivially Coolify-friendly). Alternative: **Trax LRS** (native cmi5, nice UI, Laravel+Vue). **Avoid Learning Locker Community** — effectively abandoned since 2021; HT2 Labs was acquired by Learning Pool and moved the project enterprise-only.

### 3.5 The one-source-many-outputs build pipeline

```
MDX sources (src/content/courses/**/*.mdx + frontmatter)
        │
        ▼
Astro static build (dist/)            ← React islands hydrate only runnable widgets
        │
        ▼
Unified manifest (derived from frontmatter, single JSON)
        │
  ┌─────┼──────────┬────────────┬──────────────┐
  ▼     ▼          ▼            ▼              ▼
scorm12  scorm2004-4th  cmi5    xapi-bundle  plain-html
 .zip       .zip        .zip       /            /
```

A single `Tracker` TypeScript interface in the framework exposes `init / setProgress / setBookmark / recordInteraction / setScore / complete / pass / fail / terminate`. At build time the pipeline bundles one of five adapter implementations (`ScormAgainAdapter12`, `ScormAgainAdapter2004`, `Cmi5Adapter`, `XapiAdapter`, `NoopAdapter`). Components call `tracker.setScore(0.9)` once — the adapter handles the rest. Manifests (`imsmanifest.xml`, `cmi5.xml`) are generated from Nunjucks/Handlebars templates fed from the unified JSON.

---

## 4. Runnable code integration

### 4.1 Python in browser — Pyodide, self-hosted, in a Web Worker

**Pyodide 0.29.x (CPython 3.13 compiled to WASM, MPL 2.0).** Initial wire cost is ~6–10 MB compressed for the core wasm + stdlib. JIT-free, so CPU-bound pure-Python is 3–10× slower than native, but numpy/scipy inner loops run compiled C. Pre-built wasm wheels for numpy, pandas, scipy, scikit-learn, matplotlib, Pillow, cryptography, sqlite3, plotly, bokeh, opencv-python, and ~100 others; pure-Python packages install from PyPI via `micropip`. `requests` is broken in browser — use `pyodide.http.pyfetch` or the `pyodide-http` shim.

**Self-host the runtime.** Never depend on jsDelivr in production (latency, outage risk, CSP friction, version drift). Serve from `/static/pyodide/v0.29.3/` with `Cache-Control: public, max-age=31536000, immutable`.

**Run in a Web Worker, not the main thread.** Use the JupyterLite pattern: Comlink async-only as the default (works everywhere), Coincident with `SharedArrayBuffer + Atomics.wait` when the page is cross-origin-isolated (for `input()`, blocking `time.sleep`, `KeyboardInterrupt` via `pyodide.setInterruptBuffer`). Cross-origin isolation needs `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`) — set these headers **only on the code-runner page**, not site-wide, or you break third-party embeds.

State across cells: reuse one `pyodide` instance and share `py.globals` for notebook-like persistence; pass a per-cell namespace dict for isolated cells. stdout/stderr via `pyodide.setStdout({ batched })` / `setStderr`. Matplotlib: use the `matplotlib_pyodide.html5_canvas_backend`. Persistent filesystem via IDBFS mount + `FS.syncfs`.

Robot Framework runs in Pyodide enough to install (`micropip.install("robotframework")` — it's pure-Python) but most keyword libraries (SeleniumLibrary, Browser, SSH, OperatingSystem) don't work in WASM. **Treat in-browser RF as experimental.** Server-side is the canonical runner.

### 4.2 JavaScript/TypeScript — decision matrix

| Need | Tool | Rationale |
|------|------|-----------|
| Inline JS snippet | sandboxed iframe + `new Function` | Zero deps, `sandbox="allow-scripts"` without `allow-same-origin` |
| React/Vue/Svelte component demo | **Sandpack** (Apache 2.0 bundler) | Drop-in React component, multi-file, instant |
| Node.js + npm + terminal + dev server | **StackBlitz WebContainers** | Only option; **commercial license required** for production (5-figure enterprise deal) |
| No commercial budget | Server runner + SSE stream | Fall back to FastAPI sandbox |

**Editor: CodeMirror 6, not Monaco.** 120–300 KB core vs 2–5 MB for Monaco; first-class mobile/touch; modular (only include needed language modes); Replit and Sourcegraph both migrated this direction. Use Monaco only on a dedicated "IDE" page where the VS Code feel is explicitly expected. Robot Framework syntax: write a small CM6 StreamLanguage parser (RF syntax is line-oriented and tractable), or use `@codemirror/legacy-modes` + regex highlight.

### 4.3 Server-side sandbox — FastAPI + Docker with gVisor

For Python beyond Pyodide's reach, polyglot languages, and all Robot Framework runs, build a FastAPI execution service. **Do not use `docker run` alone** — Docker's shared kernel is weak against kernel exploits.

| Sandbox | Startup | Overhead | Isolation | Verdict |
|---------|---------|----------|-----------|---------|
| Docker alone | 50 ms | Low | Weak | Insufficient |
| **gVisor (runsc)** | +few ms | 10–30% I/O | Strong (user-space kernel) | **Default** |
| Firecracker | 125 ms | Very low | Hardware KVM microVM | Upgrade for untrusted multi-tenant |
| Kata Containers | 200 ms | Moderate | K8s RuntimeClass microVM | If already on K8s |
| nsjail/bubblewrap | Fast | Low | Namespaces + seccomp | Layer inside containers |
| Wasmtime/WASI | µs | Low | Capability-based | Limited I/O, great for Python |

**Architecture:** FastAPI API (auth, rate-limit, quota, queue) → Runner pool (warm Docker+runsc workers per-language image) → Result collector (Postgres + Redis, xAPI emit). Warm pool for interactive latency; per-request ephemeral for batch grading.

**Hardening checklist** (every container): `--runtime=runsc --network=none --read-only --tmpfs /tmp:rw,size=64m,noexec --memory=256m --cpus=0.5 --pids-limit=64 --cap-drop=ALL --security-opt=no-new-privileges --security-opt seccomp=profile.json`. Wall-clock timeout at the orchestrator (never trust in-container). Output byte cap (truncate/kill at 1 MB). Non-root user inside. Destroy after every job; refill pool from a golden image. Image scanning in CI (Trivy/Grype). Per-user per-day execution quota in Redis. Path-traversal validation on all file inputs.

**Multi-language alternative to maintaining your own:** self-hosted **Judge0** (GPLv3, Isolate sandbox, 60+ languages) behind the same FastAPI gateway. GPLv3 is a copyleft concern only if you modify and redistribute Judge0; calling it over HTTP from your own code is fine — but get legal review. **Piston** (MIT, engineer-man/piston) is a lighter alternative; public API tightened to non-commercial tokens in Feb 2026, so self-host is required.

### 4.4 Robot Framework execution — synergy with rf-mcp

Many maintains [`rf-mcp`](https://github.com/manykarim/rf-mcp) — an MCP server for Robot Framework with a live `ExecutionContext`, step-wise suite building, Docker image at `ghcr.io/manykarim/rf-mcp:latest` (plus `-vnc` variant with Chromium/Firefox/WebKit preinstalled). This is a strategic asset the framework should lean into directly:

1. **Reuse the rf-mcp container image as the RF runner base.** It already bundles RF + Browser/Selenium libraries + browsers. One image covers both modes below, saving maintenance.
2. **Two operational modes per lesson type.** *Grading/batch mode* runs the classic `robot` CLI against learner code, parses `output.xml` via `robot.api.ExecutionResult` in a trusted sidecar, emits pass/fail counts and xAPI statements. *Tutorial/guided mode* runs `rf-mcp` as an HTTP MCP server with `tool_profile=minimal_exec` or `api_exec` exposing a subset of tools to an AI tutor — the AI can incrementally add keywords and help the learner debug.
3. **log.html and report.html** are self-contained — embed in an iframe with `sandbox="allow-same-origin"` served from a **separate isolated origin** (e.g. `logs.example.com`) with strict CSP to keep them out of the main app's security context.
4. **Beginner vs advanced split.** Beginner lessons use only `BuiltIn`, `Collections`, `String`, `DateTime`, `OperatingSystem` (restricted to /tmp), `Process`, `RequestsLibrary` (with egress proxy), `JSONLibrary`, `XML` — all happy in the hardened container. Advanced browser lessons use a separate opt-in `rf-mcp-vnc` runner with stricter TTLs, whitelisted egress, and ideally Firecracker/Kata for hardware isolation.
5. **Upstream synergy.** Because Many owns rf-mcp, a dedicated `learning_exec` tool profile can surface grading hooks, xAPI emitters, and UI-friendly state projections — this becomes an upstream contribution that benefits both projects.

### 4.5 xAPI tracking of code execution

Emit five canonical statement shapes: **executed-code** (custom verb, stdout/stderr/exit in extensions); **passed/failed coding challenge** (ADL registered verbs, score with scaled 0–1 and per-test breakdown); **used-hint** (custom verb, hint index + cost for mastery-style score degradation); **reset-cell** (custom verb); **cmi5 session bookends** (`launched` from LMS, `initialized` on lesson open, `terminated` on `navigator.sendBeacon` at page unload). Route through a thin xAPI proxy service so browsers never hold LRS credentials. Batch statements at rapid-fire cadence. Store only a `sha256` source-hash on every execution; store full source only on terminal pass/fail events to bound storage.

### 4.6 Rough self-hosting cost (1,000 MAU, ~40K executions/mo)

| Component | Monthly |
|-----------|---------|
| FastAPI API (2× small HA) | ~$70 |
| Runner pool (gVisor, 2× 4 vCPU/16 GB) | ~$180 |
| Postgres (managed small) | ~$120 |
| Redis (2 GB) | ~$30 |
| Object storage + egress | ~$40–90 |
| Self-hosted LRS | ~$40 |
| **Total** | **~$500–700/mo** |
| Firecracker upgrade | +2–3× runner cost |
| WebContainers commercial license | +$20–60k/year |

Steady-state per-execution cost is ~$0.01–0.03 on gVisor, ~$0.05–0.10 on Firecracker microVMs.

---

## 5. PDF export: Paged.js + headless Chromium

### 5.1 Decision

**Primary: MDX → Astro static HTML → Paged.js polyfill → Playwright-driven Chromium → PDF.** Fallback: plain `Playwright page.pdf()` against concatenated HTML for "preview" PDFs in CI. Rule out everything else.

| Approach | Quality | MDX/React support | License | Verdict |
|----------|---------|---------------------|---------|---------|
| **Paged.js + Playwright** | ★★★★½ book-quality | ★★★★★ consumes rendered HTML | MIT | **Primary** |
| Playwright `page.pdf()` alone | ★★★ | ★★★★★ | Apache-2.0 | **Fallback** |
| wkhtmltopdf | ★★ | Low | LGPL | ❌ archived |
| Typst | ★★★★★ | None (no HTML path) | Apache-2.0 | ❌ rewrite-only |
| Pandoc+LaTeX | ★★★★★ | Poor (drops JSX) | GPL | ❌ loses widgets |
| PrinceXML | ★★★★★ | ★★★★★ | Commercial ~$3,800/server | ⚠️ only if budget demands |
| WeasyPrint | ★★★★ | ★★★★ (no JS) | BSD-3 | Python fallback |
| @react-pdf/renderer | ★★★½ | ❌ reimplement all | MIT | ❌ wrong tool |
| md-to-pdf | ★★★ | MD only | MIT | ❌ no MDX |

### 5.2 Pipeline

Build the Astro site normally — Shiki syntax highlighting bakes into static HTML, Mermaid diagrams pre-render to inline SVG via `remark-mermaidjs` or `@mermaid-js/mermaid-cli` at build time. A dedicated `/print` route concatenates all lessons into one document with cover, copyright, TOC placeholder, and chapters. Inject `paged.polyfill.js`. Playwright drives Chromium: `page.goto(fileURL)`, wait for the Paged.js `after` hook, `page.pdf({ preferCSSPageSize: true, printBackground: true })`.

Key CSS uses `@page`, `string-set: chapter content()`, `target-counter(attr(href), page)` for TOC page numbers, margin-box running headers. Interactive widgets (RunnablePython, Quiz) detect `@media print` or `?print=1` and render a **static snapshot + QR code** pointing to the live URL plus a "▶ View interactive version in browser" callout — the QR code is generated at build time with `qrcode-svg`.

Reference implementation: the `docusaurus-plugin-papersaurus` source is a concrete example of the Playwright-only fallback path (cheerio + pdf-parse + easy-pdf-merge for TOC patching).

---

## 6. Content types blueprint — the MDX component API

Organized by category. Every interactive component must: (a) work in MDX with a minimal `<Tag attr />` syntax; (b) hydrate as an Astro React island only when present; (c) emit xAPI statements via the `Tracker` interface; (d) render a sensible print fallback.

### 6.1 Prose and structural

`<Lesson>`, `<Section>`, `<Divider>`, `<Spacer>`, `<Cover>`, `<Summary>`, `<Continue>` (gating). Plus Markdown-native headings, paragraphs, ordered/unordered/task lists, tables, blockquotes.

### 6.2 Callouts and emphasis

`<Callout type="tip|warning|danger|note|exercise|solution|hint">`, `<Statement variant="..." />`, `<PullQuote>`. Semantic variants drive an icon map. Admonition syntax compatibility (`:::note` style) for author convenience.

### 6.3 Media

`<Image src alt caption responsive />` with srcset generation via Astro image optimization. `<Video src|youtube|vimeo captions chapters poster />`. `<Audio>`. `<Gallery>`. `<Attachment>` (download). `<Embed url />`.

### 6.4 Interactive display

`<Accordion>` with `<AccordionItem>`; `<Tabs>` with `<TabItem>`; `<Carousel>`; `<Stepper>` / `<Process>`; `<Timeline>`; `<FlipCard front back />`; `<Flashcards deck=... mode="grid|stack" />`; `<LabeledGraphic src><Marker x y>...</Marker></LabeledGraphic>`; `<ImageHotspot>`; `<ImageJuxtaposition before after />`; `<Agamotto />` (cross-fade slider); `<Chart type="bar|line|pie" data />`.

### 6.5 Code-first signature blocks

`<RunnablePython code files packages stdin showOutput />` — Pyodide worker, persistent globals via `cellGroup="..."`. `<RunnableJS mode="sandpack|iframe" template code dependencies />`. `<RunnableRF suite variables dryRun />` → FastAPI/rf-mcp. `<Terminal image workdir persistent />`. `<CodeChallenge language starter hiddenTests hints />` — test-driven grading, emits `passed/failed` xAPI with per-test breakdown. `<CodeDiff before after language />`. `<CodeAnnotated>` — Shiki with inline numbered callouts pointing at specific tokens. `<ApiPlayground openapi method path />`. `<Scrim src />` (phase 4 — interactive screencast player).

### 6.6 Assessment

`<Quiz passingScore retries>` wraps one or more: `<MCQ>`, `<MultiResponse>`, `<TrueFalse>`, `<FillBlank>`, `<Numeric>`, `<Matching>`, `<Sequence>`, `<DragDrop>`, `<Hotspot>`, `<ShortAnswer>`. Plus `<KnowledgeCheck>` (ungraded, inline, immediate feedback). `<QuestionBank>` (random draw from tagged pool). Each question type takes a `feedback` map for per-option explanations. `<MarkTheWords passage targets />`, `<DragText passage tokens />`, `<SortParagraphs />` for text-level drills relevant to syntax learning.

### 6.7 Branching and scenarios

`<Scenario>` with `<Decision choices>` and `<Branch when>` leaves — recursively composable tree. `<DialogueSim characters scenes />` (Phase 3+). `<Variable name type initial />` + `<ShowIf condition>` / `<Trigger on action>` for conditional content.

### 6.8 Game and social (optional)

`<MemoryGame>`, `<Crossword clues grid />`, `<Poll>`, `<Reflection>`, `<ConfidenceSlider>`.

### 6.9 Navigational and metadata

`<Toc>`, `<Glossary term />` with hover tooltip, `<CrossRef to />`, `<Progress>`, `<Bookmark>`, `<Resume>`. Frontmatter schema (Zod-validated by Astro content collections) carries course/lesson ID, title, description, version, language, objectives, mastery score, cmi5 moveOn criteria, tags, estimated duration, prerequisites.

### 6.10 Long-tail content types via H5P embed

For the dozens of H5P content types that aren't worth reimplementing (Branching Scenario, Virtual Tour 360, Memory Game, Crossword, Documentation Tool, Dictation, Speak the Words, etc.), ship `<H5P src="my-content.h5p" />` which wraps the `h5p-standalone` (MIT) library to render any `.h5p` package inside an MDX lesson, forwarding xAPI events into the framework's Tracker. This delivers H5P-level breadth without reimplementing H5P-level breadth.

---

## 7. Tool stack proposal

```
┌──────────────────────────────────────────────────────────────────────┐
│                         AUTHOR / REPO                                │
│  src/content/courses/**/*.mdx      (content as code, Git-backed)     │
│  astro.config.mjs + Starlight                                        │
│  Optional UI: Keystatic (local + GitHub) → writes same files         │
└──────────────────────────────────────────────────────────────────────┘
                                   │  pnpm build
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      BUILD PIPELINE (Node)                           │
│  Astro static build → dist/                                          │
│    • Shiki syntax highlighting (Expressive Code)                     │
│    • Mermaid → inline SVG (remark-mermaidjs)                         │
│    • React islands for Quiz/Runnable/etc.                            │
│    • Pagefind static search index                                    │
│                                                                      │
│  Post-build: unified manifest from frontmatter                       │
│  Packagers (Node):                                                   │
│    • scorm12.zip      ← scorm-again 1.2 + Nunjucks imsmanifest       │
│    • scorm2004-4th.zip ← scorm-again 2004 + sequencing ns            │
│    • cmi5.zip         ← @xapi/cmi5 + cmi5.xml                        │
│    • xapi-bundle/     ← @xapi/xapi wired with config.json            │
│    • plain/           ← NoopAdapter                                  │
│                                                                      │
│  PDF: Paged.js + Playwright Chromium → course.pdf                    │
└──────────────────────────────────────────────────────────────────────┘
                                   │  deploy (Coolify)
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
┌─────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐
│  STATIC CDN / HTML  │  │   FASTAPI BACKEND     │  │  SELF-HOST LRS   │
│  course.example.com │  │  api.example.com      │  │  (Yet Analytics  │
│  (public, SEO,      │  │  • auth (SSO: OIDC)   │  │   SQL LRS)       │
│   offline-capable)  │  │  • /exec (code run)   │  │                  │
│                     │  │  • /rf (RF runner)    │  │  Postgres backend│
│                     │  │  • /xapi (LRS proxy)  │  │  xAPI 2.0 /      │
│                     │  │  • /progress (CRUD)   │  │  IEEE 9274.1.1   │
│                     │  │  • /reports           │  │                  │
│                     │  │                       │  │                  │
│                     │  │  PG (users, progress) │  │                  │
│                     │  │  Redis (rate, pool)   │  │                  │
│                     │  └──────────┬────────────┘  └──────────────────┘
│                     │             │
│                     │             ▼
│                     │  ┌───────────────────────────────────┐
│                     │  │  RUNNER POOL (Docker + runsc)     │
│                     │  │  • python:3.13-slim (Pyodide      │
│                     │  │    heavy jobs + general Python)   │
│                     │  │  • node:20-slim (server JS)       │
│                     │  │  • rf-mcp:latest (Robot Framework │
│                     │  │    batch + tutorial modes)        │
│                     │  │  • judge0 (optional multi-lang)   │
│                     │  │  network=none, read-only, tmpfs,  │
│                     │  │  cap-drop=ALL, seccomp, quotas    │
│                     │  └───────────────────────────────────┘
```

**Concrete choices at each layer:**

- **Frontend framework:** Astro 5 + Starlight + MDX 3 + `@astrojs/react` for islands.
- **Editor:** CodeMirror 6 (+ Monaco only on a dedicated IDE page).
- **Syntax highlighting:** Shiki via Expressive Code (built into Starlight).
- **Diagrams:** Mermaid pre-rendered to SVG via `remark-mermaidjs`; D2 and Excalidraw as secondary static renderers; PlantUML as a server-rendered SVG endpoint.
- **Math:** KaTeX (`rehype-katex`).
- **Search:** Pagefind (static, works in SCORM packages).
- **UI authoring:** Keystatic primary, Sveltia CMS fallback, Markdoc optional for author-safe content.
- **Backend:** FastAPI (Python 3.13) + Uvicorn + Postgres 16 + Redis 7 + SQLAlchemy 2.
- **Code execution:** Docker + gVisor runsc runtime, warm container pool, WebSocket/SSE streaming, Redis rate-limiting and quotas.
- **Robot Framework:** `ghcr.io/manykarim/rf-mcp:latest` as runner base image, dual-mode (batch `robot` CLI for grading, `rf-mcp` MCP HTTP server for tutorial mode).
- **In-browser Python:** Pyodide 0.29.x self-hosted, Web Worker with Comlink (+ Coincident on COOP/COEP isolated pages).
- **In-browser JS:** Sandpack for component demos, sandboxed iframe for snippets; WebContainers only if the customer's budget permits the commercial license.
- **SCORM runtime:** scorm-again (primary), `@xapi/xapi`, `@xapi/cmi5`.
- **LRS:** Yet Analytics SQL LRS self-hosted (Trax as alternative).
- **PDF:** Paged.js + Playwright Chromium.
- **Testing:** Robot Framework is the correct self-referential choice — run RF end-to-end tests against the framework itself (authoring, packaging, player behavior, SCORM API compliance). Use `robotframework-browser` (Playwright-based) for UI tests. Vitest for unit tests of the Node build pipeline. Pytest for FastAPI. SCORM Cloud REST API for CI conformance checks.
- **Self-hosting:** Docker Compose for dev; Coolify on a Hetzner dedicated server (CX41 / AX41 range) for single-tenant prod; K8s only when multi-tenant demands it.
- **Observability:** OpenTelemetry, Grafana + Loki + Tempo, Sentry.

---

## 8. Phased implementation plan (9–12 months)

Assumes two engineers full-time plus Many (fractional, architecture + RF expertise).

### Phase 0 — foundation and decisions (Weeks 1–3, ~3 weeks)

**Deliverables:** Monorepo scaffold (pnpm workspaces, Turborepo or Nx), Astro + Starlight baseline with one sample course, ADRs locking the decisions in this document, skeleton FastAPI service with auth and health checks, CI (GitHub Actions) with lint/type/test, Docker Compose dev environment, Coolify deployment recipe against a staging Hetzner box.

**Risks:** Bikeshedding on MDX vs Markdoc at this phase — resolve by choosing **MDX primary, Markdoc optional for non-dev content**.

**Success metric:** `pnpm create` produces a runnable course site; `pnpm build:scorm` emits a valid zip importable into SCORM Cloud (even if the zip only contains static HTML at this point).

### Phase 1 — MVP: MDX authoring + HTML + basic code + SCORM 1.2 (Weeks 4–12, ~9 weeks)

**Deliverables:** Content collection schemas (course, lesson, objective) with Zod validation. Core MDX components for prose, callouts, tables, images, video, audio, accordion, tabs, flashcards, labeled graphic, timeline, stepper. Shiki syntax highlighting for Python, JS/TS, Robot Framework, Bash, YAML, SQL. Static HTML output. **SCORM 1.2 packager** via scorm-again adapter, Nunjucks imsmanifest template, zip builder. Basic MCQ, multi-response, true/false, fill-in-blank components with xAPI events routed to a stub adapter. First-class Pagefind search. Sample "Intro to Python" course as dogfood.

**Risks:** SCORM 1.2 zip layout mistakes (macOS `__MACOSX/`, files not at root) — write unit tests that inspect the zip contents. Absolute asset URLs breaking in LMS iframes — write a post-build URL-rewriter.

**Success metric:** The sample course imports cleanly into Moodle, TalentLMS, and SCORM Cloud; completion and score events appear correctly in each LMS.

### Phase 2 — runnable Python + quizzes + PDF (Weeks 13–20, ~8 weeks)

**Deliverables:** `<RunnablePython>` component with Pyodide self-hosted, Web Worker, Comlink pattern, stdout/stderr streaming, matplotlib support, micropip hook. `<CodeChallenge>` with hidden test cases and auto-grading. Remaining quiz types (matching, sequence, drag-drop, hotspot, short answer). `<QuestionBank>` with random draw. Progress tracking API in FastAPI (user, course, lesson, cell, state). **PDF export via Paged.js + Playwright** with Mermaid pre-render, `?print=1` snapshot mode for interactive widgets, QR codes. Begin Robot Framework-based E2E test suite against the framework itself.

**Risks:** Pyodide cold-start latency on first lesson — precache via Service Worker, skeleton loader. Cross-origin isolation breaking site-wide embeds — scope COOP/COEP headers to the runnable-code page only.

**Success metric:** 10-cell Python lesson loads in <3s on a cold cache, all cells run, state persists across cells. PDF of the sample course is print-shop quality (TOC with page numbers, running headers, chapter breaks).

### Phase 3 — runnable JS + RF + xAPI + cmi5 + advanced content (Weeks 21–32, ~12 weeks)

**Deliverables:** `<RunnableJS>` via Sandpack for component demos and sandboxed iframe for snippets. **FastAPI sandbox service** with Docker + gVisor, warm container pool, per-user rate limits and quotas, WebSocket output streaming. `<RunnableRF>` component wired to rf-mcp-based runner (batch mode for grading, MCP tutorial mode for AI assistance). `@xapi/xapi` and `@xapi/cmi5` adapters with the unified Tracker interface. **SCORM 2004 4th Ed** and **cmi5 packagers**. Self-host Yet Analytics SQL LRS. `<Scenario>` branching component. `<H5P>` embed wrapper for long-tail content types via h5p-standalone. Advanced content types: `<LabeledGraphic>` polished, `<Timeline>`, `<InteractiveVideo>` with timestamp questions, `<Glossary>` hover tooltips. Accessibility audit pass (WCAG 2.2 AA).

**Risks:** Runner cost blow-up under abuse — enforce Redis-based quotas early, implement CPU anomaly detection. cmi5 session/registration state edge cases — test against SCORM Cloud's cmi5 reference exhaustively.

**Success metric:** End-to-end RF lesson (write test, execute, get graded, resume later, earn completion) works in Docebo and SCORM Cloud for cmi5 and 2004 4th respectively; LRS receives all expected statements.

### Phase 4 — UI authoring + LRS analytics + dashboards (Weeks 33–40, ~8 weeks)

**Deliverables:** **Keystatic integration** in the Astro app with schemas matching the framework's content collections; custom block components for Quiz, RunnablePython, Terminal usable in the Keystatic editor. Author preview mode. Sveltia fallback for zero-integration edit. Learner dashboard in Astro + React (progress across courses, badges, bookmarks). Author analytics dashboard reading from LRS (completion rates, quiz difficulty, code challenge success rates, time-on-task). `<Scrim>` interactive screencast v1 (CodeMirror-based event recorder + player) as a flagship differentiator.

**Risks:** Keystatic cadence concerns — have Sveltia drop-in ready. Scrim scope creep — ship a minimum viable version (record keystrokes + audio + run), iterate.

**Success metric:** A non-developer author creates a new lesson end-to-end in Keystatic without touching terminal; dashboard shows accurate learner progress within 5s of statement POST.

### Phase 5 — enterprise: SSO, multi-tenant, marketplace (Weeks 41–52, ~12 weeks)

**Deliverables:** OIDC SSO (Keycloak as reference, Azure AD, Okta, Google Workspace). Multi-tenant data isolation in Postgres (schema-per-tenant or row-level security). Organization-level roles (owner/author/reviewer/learner). Billing integration (Stripe) if commercial. Course marketplace: discoverable public catalog, ratings, featured courses. Enterprise reporting exports (CSV, parquet to S3). SLA-grade observability. Security review + pen-test.

**Risks:** Multi-tenant data leakage — row-level security + rigorous test harness. SSO edge cases — dogfood via three different IDPs before launch.

**Success metric:** A paying enterprise customer with >1K learners, SSO-authenticated, using the cmi5 export into their own LMS, with analytics consumed in their BI tool.

### Team velocity assumptions

Two senior full-stack engineers + Many fractional yields ~40 engineer-weeks of throughput per calendar quarter. The plan above totals ~52 weeks of scope; expect 10–15% slippage for real-world integration surprises (LMS bugs dominate). A two-engineer team can ship through Phase 3 (core product) in ~8 months; Phases 4–5 require either additional hiring or a longer calendar.

---

## 9. Prior art assessment and why greenfield is right

The closest conceptual sibling is **LiaScript** + `LiaScript-Exporter` (BSD-3, active) — exactly the shape of "plain-text markdown → interactive course → SCORM/xAPI/PDF." Its Elm-based runtime and custom Markdown dialect make it unforkable for MDX/React/Astro, but its source is the single best reference implementation for SCORM manifest structure, cmi5 packaging, the iframe workaround for ILIAS/OpenOLAT, and the Moodle 4 `--scorm-embed` dance. Study it, do not fork it.

Beyond LiaScript the landscape is sharply bifurcated. On the library side, small-and-solid primitives exist: **scorm-again** (LMS API runtime), **@xapi/xapi** and **@xapi/cmi5** (modern xAPI/cmi5 clients), **simple-scorm-packager** (zip + manifest, quiet but works), **react-scorm-provider** (@code-by-dwayne fork is the maintained one), **h5p-standalone** (embed any .h5p), **Mermaid CLI**, **Shiki**, **Paged.js**, **pipwerks** (legacy fallback). These are perfect dependencies to assemble.

On the platform side, the heavyweight open-source projects are whole alternative universes rather than libraries: **Adapt Framework** (GPL v2, JSON-authored, Spoor extension is the SCORM reference); **Oppia** (Apache 2.0, hosted Python+Angular platform); **H5P** (MIT content-type ecosystem, PHP-rooted with standalone JS). Forking any of them means adopting their content model and effectively becoming a fork of their community.

Commercial SaaS (Articulate, Mintlify-for-docs, EasyGenerator, Smartcat's generators) confirms market demand but offers no reusable code. Most tellingly, there are **no Astro, Next.js, or Gatsby SCORM starter templates** of any substance. The claimed `rowanmanning/scorm-packager` does not exist (that repo is unrelated to eLearning — likely confusion with `lmihaidaniel/simple-scorm-packager`).

**Conclusion: greenfield is justified.** The specific combination of MDX authoring + React island widgets + Shiki + Astro static build + SCORM 1.2/2004 + cmi5 + xAPI + Paged.js PDF + executable code in lessons has no open-source precedent. Assemble from the proven dependencies above and treat LiaScript-Exporter's source as the authoritative reference for every manifest and LMS edge case.

---

## 10. The top 10 risks and trade-offs

1. **React runtime bloat inside SCORM packages.** A SCORM zip is a full static site shipped with every course. Starlight's islands architecture mitigates this (near-zero JS on prose pages, hydrate only runnable widgets), but a course with a dozen `<RunnablePython>` cells still ships Pyodide loader + CodeMirror + adapter — easily 200 KB JS + the deferred Pyodide wasm. **Mitigation:** defer Pyodide loading until first "Run" click; tree-shake CodeMirror to only needed language modes; consider a per-course toggle to compile to static HTML only (no runnable widgets) when the LMS context doesn't need them.

2. **LMS inconsistency on SCORM 2004.** Moodle is incomplete; SAP SuccessFactors supports 2nd and 4th Ed but not 3rd; TalentLMS is 1.2 only; Cornerstone persists completion but drops interactions. **Mitigation:** ship SCORM 1.2 as the universal default; publish a tested LMS compatibility matrix; gate 2004 output behind a "requires testing" warning; run SCORM Cloud conformance in CI as the reference behavior.

3. **Cost and security of server-side code execution.** Untrusted RF/Python/Judge0 execution is the highest-risk surface in the whole system. A single missed `--network=none` or broken seccomp profile is a kernel exploit away from a breach. **Mitigation:** gVisor by default, Firecracker for high-risk multi-tenant, per-user quotas enforced in Redis before the container starts, ephemeral containers, dedicated runner host pool separate from app servers, bug bounty post-launch.

4. **WebContainers commercial licensing.** Real in-browser Node requires a sales-gated StackBlitz enterprise license (industry estimates low-to-mid 5 figures/year). **Mitigation:** design lessons to use Sandpack for component demos and the FastAPI server runner for full-stack Node; offer WebContainers as a paid upgrade tier tied to a customer-provided license.

5. **Cross-origin isolation trade-off.** Pyodide synchronous features (`input()`, `KeyboardInterrupt`, synchronous FS sync) require COOP: same-origin + COEP: require-corp, which break many third-party embeds. **Mitigation:** scope these headers to the code-runner page path only, not site-wide; use Comlink async-only as default everywhere else; document this clearly for authors.

6. **Pyodide cold start.** 6–10 MB wasm + stdlib over a slow connection is a 10–30 second first load. **Mitigation:** service worker pre-cache on course enter; skeleton loader UI; `<link rel="preload" as="fetch" crossorigin>` the wasm early; cache with `immutable` + version-in-URL for perfect hit rates on repeat visits; offer a "lightweight mode" using MicroPython for mobile learners on constrained networks.

7. **Robot Framework browser automation in lessons.** Running SeleniumLibrary or Browser library inside the sandbox means nested Chromium — resource-heavy, opens privilege escalation paths. **Mitigation:** split into two runner images (`rf-mcp:latest` for non-browser RF, `rf-mcp-vnc` for advanced browser lessons), stricter TTLs and quotas on the VNC variant, Firecracker-level isolation for multi-tenant, whitelisted egress proxy.

8. **MDX authoring complexity for non-developers.** Raw MDX is intimidating; a typo in a component prop breaks the build. **Mitigation:** use **Markdoc for author-facing content** with schema-validated tags (`{% quiz %}`), reserving full MDX for developer-authored components; integrate Keystatic with typed schemas and live preview; provide a component-picker palette in the editor.

9. **Single-maintainer/abandonment risk on dependencies.** scorm-again is essentially one person; `simple-scorm-packager` hasn't shipped in four years; Learning Locker died; Contentlayer was abandoned. **Mitigation:** vendor scorm-again source with version pinning; contribute upstream to keep it healthy; have a fallback packaging implementation ready; choose Yet Analytics SQL LRS specifically because it's actively maintained.

10. **xAPI statement explosion and storage cost.** At "executed code" frequency, a single 20-minute lesson can emit hundreds of statements per learner. **Mitigation:** debounce rapid-fire runs at the client, batch statements to the LRS, store only source-hashes on intermediate runs (full source only on terminal passed/failed events), retention policy on raw statements (keep aggregates longer), summary statements at session end as the authoritative record for reporting.

---

## Open questions worth resolving before phase 1

- **License of the framework itself.** MIT maximizes adoption and mirrors H5P core. Apache 2.0 adds explicit patent grant. AGPL would align with the Robot Framework Foundation's open-source ethos but scares enterprises. Recommendation: **MIT on the core framework and components**, leave GPL/AGPL plugins (e.g. any Adapt Spoor-derived code) as optional dependencies.
- **Hosted SaaS vs OSS-only.** A hosted tier (template catalog, managed LRS, shared runners) would fund development and serve community users who don't self-host. Recommendation: OSS core + optional hosted tier post Phase 4.
- **Course marketplace governance.** If a public course catalog lands in Phase 5, who moderates content and how are runtime/infra costs for popular courses funded? Decide before building.
- **Target LMS certification.** Pursue official SCORM Certified status via ADL? Cost vs marketing value tradeoff; likely not in year one.
- **AI authoring assist.** Every commercial incumbent ships AI course generation (EasyGenerator EasyAI, Captivate prompt-to-slide, Articulate AI Assistant). A code-first framework is unusually well-suited for this — MDX is the ideal format for LLM output. Recommendation: Phase 4+ feature, powered by a BYO-API-key pattern.

---

## Conclusion: the three decisions that matter most

First, **Starlight (Astro) + MDX + React islands is the foundation.** It is the only combination that produces SCORM-friendly static bundles, aligns with Many's stack, extends cleanly to custom widgets, and ships the full modern docs DX (search, i18n, versioning, Shiki) for free. Everything else is optimization on top of this choice.

Second, **the standards story is cmi5 + SCORM 1.2, both built on a single Tracker abstraction.** This unlocks modern xAPI analytics via a self-hosted LRS while retaining universal LMS compatibility. SCORM 2004 is an opt-in; pure xAPI is an advanced configuration. Do not try to make every standard a peer.

Third, **the code-execution strategy leans on Many's existing assets and splits browser vs server pragmatically.** Pyodide in a Web Worker handles browser Python; Sandpack handles browser JS/React demos; a FastAPI + Docker + gVisor sandbox — reusing `ghcr.io/manykarim/rf-mcp:latest` as the Robot Framework runner image — handles everything else. This strategy is cheap to operate, secure by construction, and turns rf-mcp into a competitive moat that no commercial authoring tool can match.

The market gap is real. No open-source or commercial authoring tool today treats executable code in technical lessons as a first-class primitive. Building this framework is an 8–12 month effort with two to three engineers, and the resulting product will sit in a category of its own.