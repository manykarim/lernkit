# 01 — Ubiquitous Language

Glossary ordered by bounded context. For every term:

- **Name** — the canonical word.
- **Definition** — what the term means inside this context.
- **Context(s)** — where it is valid. If a term appears in multiple contexts, its meaning is pinned per context and an [ACL](./05-anti-corruption-layers.md) translates on the boundary.
- **Aliases to avoid** — names the team must not use interchangeably.

Conventions used throughout the DDD docs:

- **Aggregates** are in **bold**.
- _Entities_ are in _italics_.
- *Value Objects* are in *italics* (distinguishable by context — entities have an identity field, VOs do not).
- `Domain events` are in `monospace`, past tense.

Research citations use "§N" referring to [`compass_artifact_...md`](../research/compass_artifact_wf-292dc733-175b-4d9e-b108-ac3492a7a5db_text_markdown.md).

---

## A. Authoring context

| Term | Definition | Aliases to avoid |
|---|---|---|
| **Course** | The top-level aggregate representing a complete training artifact. Has a stable ID, title, version, language, objectives, prerequisites. Serialized as a content-collection entry (§2.3, §6.9). | "Training", "Curriculum" |
| **Module** | Ordered group of lessons inside a course. An entity with identity scoped to its parent course. | "Unit" (ambiguous with cmi5 AU) |
| _Lesson_ | An entity — one MDX file under `src/content/courses/**/*.mdx`. Has frontmatter and a body. | "Page", "Slide" |
| _Section_ | A named division inside a lesson (`<Section>`); entity with identity per-lesson. | "Block" (reserved for a different concept) |
| *Frontmatter* | Value object — the Zod-validated YAML header carrying lesson metadata: id, title, version, objectives, mastery score, cmi5 moveOn, tags, duration, prerequisites (§6.9). | "Metadata" (too vague) |
| **ContentCollection** | The Astro construct grouping course entries with schema validation; an authoring aggregate root for *non-runnable* content at build time. | "Bundle" |
| _Component_ | An MDX-invocable React island (e.g. `<RunnablePython>`, `<Quiz>`, `<Callout>`). Entity in the authoring context because it has a stable component-name identity and version. | "Widget" (reserved for Rendering) |
| *Block* | A coarse-grained structural MDX element (Callout, Accordion, Tabs item body). Value object. | "Component" |
| *Slot* | A named child region of a compound component (`<Tabs>` has `<TabItem>` slots). Value object. | "Child" |
| *Admonition* | Markdown-native syntax (`:::note`) rendered as a `<Callout>`. Value object. | — |
| *Callout* | The rendered admonition with an icon and semantic variant (tip, warning, danger, note, exercise, solution, hint) (§6.2). Value object. | — |
| _Runnable_ | Abstract category covering any Component that produces an `ExecutionRequest` — `<RunnablePython>`, `<RunnableJS>`, `<RunnableRF>`, `<Terminal>`. Entity with a per-cell identity. | "Exec block" |
| **Challenge** | Aggregate root for a test-graded coding exercise (`<CodeChallenge>`). Owns starter code, hidden tests, hints, passing criteria (§6.5). | "Exercise" (too generic) |
| **QuestionBank** | Aggregate root for a tag-filtered pool from which `<Quiz>` randomly draws (§6.6). | "Pool" |
| **Scenario** | Aggregate root for a branching decision tree (`<Scenario>` + `<Decision>` + `<Branch>`) (§6.7). | — |
| _Decision_ | Entity inside a Scenario — one choice point with multiple branches. | "Fork" |
| _Branch_ | Entity inside a Decision — a single outcome path, recursively composable. | — |
| *Variable* | Value object declared with `<Variable>`, used by `<ShowIf>` and `<Trigger>` for conditional display (§6.7). | — |
| *Trigger* | Value object: `on action → effect` rule binding a learner action to a state change. | "Handler" |
| *Objective* | Value object in Frontmatter: one learning objective string plus optional Bloom level and mastery criterion. | "Goal" |
| *MasteryCriterion* | Value object: the threshold (passing score, cmi5 moveOn, attempt cap) that qualifies a learner as having mastered an objective. | "Pass" |
| *Prerequisite* | Value object referencing another Course/Module/Objective the learner must complete first. | "Dep" |
| **Glossary** | Aggregate root per course — a term dictionary consumed by `<Glossary term>` hover tooltips (§6.9). | — |

## B. Content Rendering context

| Term | Definition | Aliases to avoid |
|---|---|---|
| _Island_ | An Astro-hydrated React component instance at runtime (§2.2). Entity with a per-page identity. | "Widget" (our usage) — but Astro docs call it "island" canonically, so honor that. |
| *StaticHtml* | Value object — the SSR output of a page, containing zero JS unless islands exist. | — |
| *PrintFallback* | Value object — the `@media print` or `?print=1` rendering of an Island, substituting a static snapshot + QR callback (§5.2). | — |
| *Hydration* | Value object — the `client:load` / `client:visible` / `client:idle` directive attached to an Island. | — |
| *PrerenderedSvg* | Value object — a Mermaid/D2/Excalidraw diagram rendered to inline SVG at build time via `remark-mermaidjs` (§5.2, §7). | — |
| *Snapshot* | Value object — a static image/SVG/HTML frozen rendering of an interactive Island for PDF export. | "Screenshot" (implies bitmap) |
| *QrCallback* | Value object — the QR-code SVG on a print snapshot linking to the live interactive URL (§5.2). | — |

## C. Standards / Tracking context

This is the densest collision zone. Terms are tagged by *which spec* they came from.

| Term | Definition | Source spec | Aliases / collisions |
|---|---|---|---|
| **Registration (cmi5)** | A UUID scoping every statement for one learner's engagement with one course/AU. MUST appear in `context.registration` on every cmi5 statement (§3.2). | cmi5 | Collides with SCORM Registration (below) and IAM Registration (OIDC account creation). Canonical meaning *inside* the Tracking context is **cmi5 Registration**; an ACL translates to SCORM's enrollment id and IAM's account id. |
| **Registration (SCORM)** | A durable pairing of (learner, course package) that persists across sessions — what the LMS creates when the learner is enrolled. | SCORM 1.2 / 2004 | Do not use the bare word "Registration" in context-crossing conversation. |
| _Session_ (xAPI) | A grouping of statements sharing a `context.extensions` session id — typically one launch-to-close cycle. | xAPI 2.0 | Not an HTTP session. |
| _Session_ (SCORM) | Time accumulated in `cmi.core.session_time` (1.2: `HH:MM:SS.SS`) or `cmi.session_time` (2004: ISO 8601 duration) (§3.2). | SCORM | — |
| _Attempt_ | Entity — one traversal of a Lesson or Challenge by a learner. Has an id, registration, start/end, result. | Lernkit domain | "Try" |
| *Completion* | Value object representing "the learner finished the activity" — independent of success. | xAPI / cmi5 / SCORM 2004 | Collapsed in SCORM 1.2 into `lesson_status` (see below). |
| *Success* | Value object representing "the learner passed" — independent of completion. | xAPI / cmi5 / SCORM 2004 | — |
| *SuspendData* | Value object — opaque state blob the player stashes in the LMS to resume later. **SCORM 1.2 limit: 4,096 characters. SCORM 2004 limit: 64,000 characters** (§3.2). | SCORM | "State" |
| *Bookmark* | Value object — the last-viewed location identifier inside a Course. Persisted server-side plus mirrored into SuspendData when appropriate. | Lernkit domain | "Resume point" |
| *LessonStatus* | SCORM 1.2 single-field status — one of `passed / failed / completed / incomplete / browsed / not attempted`. Writing `passed` erases `completed` (§3.2). | SCORM 1.2 | Do not confuse with CompletionStatus or SuccessStatus. |
| *CompletionStatus* | SCORM 2004 / cmi5 field — one of `completed / incomplete / not attempted / unknown`. Orthogonal to SuccessStatus. | SCORM 2004 / cmi5 | — |
| *SuccessStatus* | SCORM 2004 / cmi5 field — one of `passed / failed / unknown`. Orthogonal to CompletionStatus. | SCORM 2004 / cmi5 | — |
| *Interaction* | Value object — one quiz question response (`cmi.interactions.N.*`). | SCORM | "Response" |
| *Score* | Value object bundling *RawScore*, *ScaledScore*, *MinScore*, *MaxScore*. | All | — |
| *ScaledScore* | Value object in `[-1.0, 1.0]` per xAPI / SCORM 2004 / cmi5. | — | — |
| *RawScore* | Value object — raw numeric grade, needs Min/Max for meaning. | SCORM 1.2 | — |
| *PassingScore* | Value object — threshold ScaledScore. | Lernkit domain | — |
| *SessionTime* | See `Session (SCORM)`. | — | Not `session_id`. |
| _Activity_ | xAPI entity identified by an `ActivityId` IRI. Stable across versions (§3.2). | xAPI | — |
| *ActivityId* | Value object — a globally unique IRI (e.g. `https://lernkit.dev/courses/py101/lessons/loops`). MUST NOT change between re-publishes (§3.2). | xAPI | "URL" |
| *IRI* | Value object — Internationalized Resource Identifier. | xAPI | — |
| *Verb* | Value object — the action predicate of a Statement (`http://adlnet.gov/expapi/verbs/passed`). | xAPI | — |
| **Statement** | Aggregate root inside Tracking — the triple Actor + Verb + Object plus context, result, timestamp (§4.5). | xAPI | — |
| _Actor_ | Entity — the learner subject of a Statement. | xAPI | "User" (IAM term) |
| **LRS** | Learning Record Store. Yet Analytics SQL LRS self-hosted (§3.4). An external system; the LRS Gateway context speaks to it. | — | — |
| _Adapter_ | Entity — one of `ScormAgainAdapter12 / ScormAgainAdapter2004 / Cmi5Adapter / XapiAdapter / NoopAdapter` (§3.5). | Lernkit domain | — |
| **Tracker** | Aggregate root — the unified domain-level facade exposing `init / setProgress / setBookmark / recordInteraction / setScore / complete / pass / fail / terminate` (§3.5). | Lernkit domain | Not the `Adapter` (the Tracker dispatches to the Adapter). |
| *MoveOn* | Value object — the cmi5 condition for the AU satisfying the block (`Passed`, `Completed`, `CompletedAndPassed`, etc.). | cmi5 | — |
| _AU_ | Assignable Unit — the cmi5 entity representing one trackable launchable activity. One Lernkit Lesson typically maps to one AU. | cmi5 | — |
| *LaunchMode* | cmi5 value (`Normal / Browse / Review`). | cmi5 | — |
| *LaunchMethod* | cmi5 value (`OwnWindow / AnyWindow`). | cmi5 | — |
| *ReturnURL* | Value object — cmi5 parameter the AU must redirect to on exit. | cmi5 | — |

### C.1 Explicit collision resolution — "Registration"

| Meaning | Context | Canonical term to use |
|---|---|---|
| cmi5 UUID scoping statements | Tracking / LMS Launch | **cmi5 Registration** |
| SCORM enrollment record | Learner Progress / Tracking (SCORM adapter) | **Enrollment** internally; "SCORM Registration" when talking to an LMS |
| IAM account creation | Identity & Tenancy | **Signup** or **AccountCreation** — never "registration" |

### C.2 Explicit collision resolution — "Session"

| Meaning | Context | Canonical term |
|---|---|---|
| Accumulated seconds in a SCORM attempt | Tracking (SCORM adapter) | **SessionTime** |
| HTTP cookie-bound auth span | Identity & Tenancy | **AuthSession** |
| xAPI statement grouping | Tracking (xAPI adapter) | **xAPI Session** |

### C.3 Explicit collision resolution — "Profile"

| Meaning | Context | Canonical term |
|---|---|---|
| xAPI statement-shape constraint set (including cmi5) | Tracking | **xAPIProfile** |
| rf-mcp tool-exposure policy (e.g. `minimal_exec`, `api_exec`, `learning_exec`) | Robot Framework Execution | **ToolProfile** (§4.4) |
| seccomp syscall filter JSON | Code Execution | **SeccompProfile** (§4.3) |

---

## D. Code Execution context

| Term | Definition | Aliases to avoid |
|---|---|---|
| **ExecutionRequest** | Aggregate root — a submitted run. Carries language, source, stdin, packages, time/memory caps, profile reference (§4.3). | "Job" (too generic) |
| *ExecutionResult* | Value object — the terminal outcome: exit code, stdout/stderr, duration, captured files. | — |
| _Runner_ | Entity — a single container process pulled from the WarmPool to execute one ExecutionRequest. | "Worker" |
| **Sandbox** | Aggregate root — the isolation boundary around a Runner (gVisor runsc, seccomp, read-only rootfs, no network, tmpfs) (§4.3). | "Container" (underspecified) |
| _WarmPool_ | Entity — the Redis-tracked pool of pre-spawned Runners per language image. | "Queue" |
| *Image_ | Value object — a container image tag (e.g. `ghcr.io/manykarim/rf-mcp:latest`) (§4.4). | — |
| *Profile* (Code Execution sense) | Value object — a named bundle of `ResourceLimits` + `SeccompProfile` + `EgressPolicy` + Image. Collides with Tracking's xAPIProfile and RF's ToolProfile — use the context prefix. | — |
| *Quota* | Value object — per-user per-day execution count and cumulative CPU-seconds (§4.3). Enforced in Redis *before* container spawn. | "RateLimit" |
| *Timeout* | Value object — wall-clock cap enforced by the orchestrator, never by in-container code (§4.3). | — |
| *Stream* | Value object — a server-sent-events or WebSocket conduit for stdout/stderr/stdin. | — |
| *StreamChunk* | Value object — a single frame on a Stream: `{kind: stdout|stderr|stdin|exit, payload, seq}`. | — |
| *StdinFrame / StdoutFrame / StderrFrame* | Value objects — specialized StreamChunks. | — |
| *ExitCode* | Value object — process exit status. | — |
| *ResourceLimits* | Value object — `{cpu_shares, memory_bytes, pids, tmpfs_bytes, wall_seconds}` (§4.3). | — |
| *SeccompProfile* | Value object — the syscall-filter JSON attached to every Sandbox (§4.3). | — |
| *EgressPolicy* | Value object — outbound-network rules (`none` by default; allowlist for browser-lesson runners). | — |
| **Grader** | Aggregate root — owns the test harness that runs hidden tests against an ExecutionResult to produce a grade (§6.5). | "Judge" (too close to Judge0) |
| *TestCase* | Value object — one (name, input, expected-output) tuple. | — |
| *HiddenTest* | Value object — a TestCase the learner cannot see (§6.5). | — |
| *Hint* | Value object — a hint in the hint ladder, with index and cost (§4.5, §1.3). | — |

## E. Robot Framework Execution context

| Term | Definition | Aliases to avoid |
|---|---|---|
| **Suite** | Aggregate root — one `.robot` or `.resource` document tree. | — |
| _Test_ | Entity — one test case inside a Suite. | "Scenario" (ambiguous with Authoring) |
| _Keyword_ | Entity — one user/library keyword invocation. | — |
| **ExecutionContext** | Aggregate root exposed by `rf-mcp` — the live, incrementally-built suite state the AI tutor operates on (§4.4). | "Session" (collision — see C.2) |
| *ToolProfile* | Value object — the rf-mcp MCP tool-exposure policy (`minimal_exec`, `api_exec`, `learning_exec`) (§4.4). | bare "Profile" |
| *OutputXml* | Value object — the RF-emitted `output.xml` parsed by `robot.api.ExecutionResult` (§4.4). | — |
| *LogHtml* | Value object — RF `log.html`, served from an isolated origin (`logs.example.com`) inside a sandboxed iframe (§4.4). | — |
| *ReportHtml* | Value object — RF `report.html`. | — |
| *DryRun* | Value object — the RF `--dryrun` invocation flag, enabling syntax-only analysis. | — |
| *Listener* | Value object — an RF listener class attached for xAPI emission. | — |
| *LibraryImport* | Value object — an `*** Settings ***` import declaration (`Library SeleniumLibrary`). | — |

## F. Packaging context

| Term | Definition | Aliases to avoid |
|---|---|---|
| **CoursePackage** | Aggregate root — the build output targeted for one PackageKind (§3.5). | "Bundle" |
| *PackageKind* | Value object — one of `scorm12 | scorm2004-4th | cmi5 | xapi | plain`. | — |
| **Manifest** | Aggregate root inside a Package — the spec-mandated descriptor file (§3.2). | — |
| *ImsManifest* | Value object — rendered `imsmanifest.xml` via Nunjucks template (§3.5). **MUST sit at zip root** (§3.2). | — |
| *Cmi5Xml* | Value object — rendered `cmi5.xml` course structure. | — |
| *ActivityTree* | Value object — the course/module/lesson tree serialized for the manifest. | — |
| *AssetRewrite* | Value object — a post-build URL transform mapping absolute URLs to package-relative ones for LMS iframe compatibility. | — |
| *ZipLayout* | Value object — the invariant-enforcing structural description (no `__MACOSX/`, no `.DS_Store`, manifest at root) (§3.2). | — |

## G. Progress & Assessment context

| Term | Definition | Aliases to avoid |
|---|---|---|
| **Enrollment** | Aggregate root — (learner, course) pairing with its own lifecycle. Maps to SCORM registration. | See C.1. |
| _Attempt_ (Assessment) | Entity — one attempt at a Challenge or Quiz, scoped to an Enrollment. | — |
| *Score* | Value object — see §C. | — |
| *Feedback* | Value object — per-option or per-test explanatory text attached to a response (§6.6). | — |
| *ReviewMode* | Value object — boolean flag on an Attempt — "post-submit, answers visible". | — |
| *Resume* | Value object — the Bookmark + SuspendData payload retrieved on re-entry. | — |

## H. Tenancy / Identity context

| Term | Definition | Aliases to avoid |
|---|---|---|
| **Tenant** | Aggregate root — the top-level isolation boundary. Row-level-security key on every tenant-scoped table. | "Customer" |
| _Workspace_ | Entity — subdivision of a Tenant (e.g. per-team content collections). | — |
| _Organization_ | Entity — alias for Tenant in customer-facing copy. | — |
| _Author / Reviewer / Learner / Admin_ | Entities — IAM principals. Roles attach these to Permissions. | "User" (too vague) |
| *Role* | Value object — a named permission bundle. | — |
| *Permission* | Value object — a fine-grained grant. | — |
| _Identity_ | Entity — the OIDC Subject record. Owns credentials externally. | — |
| *Subject* | Value object — the OIDC `sub` claim. | — |

## I. Observability context

| Term | Definition | Aliases to avoid |
|---|---|---|
| *TraceId* | Value object — OTel trace id propagated from browser run → FastAPI → sandbox → LRS emission. | — |
| *StatementBatch* | Value object — a batched set of xAPI Statements POSTed to the LRS to bound rate (§4.5). | — |
| *DebouncedRun* | Value object — a client-side coalesced ExecutionRequest (rapid "Run" clicks collapse into one emission) (§4.5). | — |
| *SourceHash* | Value object — `sha256(source)` — the identifier stored on intermediate `executed-code` statements to bound storage; full source only stored on terminal pass/fail events (§4.5). | — |
