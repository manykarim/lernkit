---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0010 — Use CodeMirror 6 as the primary in-lesson editor

## Context and Problem Statement

Every runnable code cell, code challenge, and interactive screencast needs an embedded editor. The editor ships inside SCORM packages (ADR 0002 flagged
per-package bundle size as a hard constraint) and must run on mobile devices used by learners on the go. It must support at minimum Python, JavaScript,
TypeScript, Robot Framework, Bash, YAML, and SQL syntax highlighting, plus basic edit affordances (autocomplete, line numbers, diagnostics).

## Decision Drivers

- **Bundle size.** A SCORM zip ships a full static site; the editor's JS payload is paid per learner launch.
- **Mobile / touch support.** Training on tablets and phones is a real use case; editor must handle touch input, soft keyboards, pinch-zoom.
- **Modularity.** We do not want to ship the Go language service for a Python lesson.
- **Language coverage.** Must support Python, JS/TS, RF, Bash, YAML, SQL out of the box or via easy community grammars.
- **API stability.** The editor will underpin the `<Runnable*>` components and the future `<Scrim>` screencast player — rewrites are expensive.
- **IDE-tier option available when needed.** Some lessons (e.g. "Intro to TypeScript types") genuinely want the Monaco / VS Code feel.

## Considered Options

- **A:** CodeMirror 6 as the default editor everywhere; Monaco only on dedicated "IDE" pages where the VS Code feel is explicitly the pedagogical point.
- **B:** Monaco everywhere (same as vscode.dev).
- **C:** Ace Editor.
- **D:** Plain `<textarea>` with Prism/Shiki for read-only display.

## Decision Outcome

Chosen option: **A — CodeMirror 6 (CM6) as the primary in-lesson editor, with Monaco reserved for a dedicated IDE page where VS Code parity is the feature.**

### Rationale (grounded in research §4.2)

- **Bundle size: 120–300 KB core for CM6 vs 2–5 MB for Monaco.** Inside a SCORM package this is paid per learner per launch. Monaco's footprint alone would
  be 10–20× the rest of a prose lesson's JS.
- **Mobile / touch is first-class in CM6.** Monaco's touch story is poor.
- **Modular packaging.** CM6 ships as small `@codemirror/lang-python`, `@codemirror/lang-javascript` packages etc. A lesson can ship only the language it
  needs.
- **Industry signal.** Replit and Sourcegraph both migrated editor stacks toward CodeMirror 6 — they care about the same constraints we do.
- **Robot Framework syntax.** RF is line-oriented and tractable — we write a small CM6 StreamLanguage parser (or use `@codemirror/legacy-modes` + regex
  highlighting) rather than hoping for a Monaco TextMate grammar.

### Monaco exception

Monaco ships on **one dedicated page** (e.g. `/ide/...`) for lessons where VS Code parity is the pedagogical point. That page is loaded on-demand — it does
not ship inside the default SCORM package; if a customer needs it in SCORM, they accept the larger zip.

### Language coverage commitments

Shipped out-of-the-box via official CM6 packages:

- Python — `@codemirror/lang-python`
- JavaScript / TypeScript — `@codemirror/lang-javascript`
- Markdown — `@codemirror/lang-markdown`
- HTML / CSS — `@codemirror/lang-html`, `@codemirror/lang-css`
- JSON — `@codemirror/lang-json`
- SQL — `@codemirror/lang-sql`
- YAML — community `@codemirror/lang-yaml`
- Bash — community grammar via `@codemirror/legacy-modes/mode/shell`
- **Robot Framework — in-house CM6 StreamLanguage parser** (contributed upstream as a standalone package once stable).

### Consequences

- **Performance, good:** ~120–300 KB CM6 + language mode vs multi-MB Monaco; huge win for SCORM payload.
- **Portability, good:** mobile / touch support is first-class.
- **Portability, good:** language-per-lesson bundling keeps each package minimal.
- **Functionality, mixed:** CM6 has simpler IntelliSense than Monaco — adequate for training, insufficient for "learn VS Code" lessons.
- **Clarity, bad:** two editor paths (CM6 default + Monaco IDE page) means some components must be aware of which page they are on. Kept out of most
  authors' sight by always using CM6 in `<Runnable*>` components.
- **Testability, good:** CM6 has a stable unit-testable API; our RF parser is a small module we can test directly.

## Pros and Cons of the Options

### A — CM6 default + Monaco IDE page

- Good: best size/capability trade-off.
- Good: aligns with Replit / Sourcegraph industry direction.
- Bad: RF grammar is our problem — small effort, upside is an upstream contribution.

### B — Monaco everywhere

- Bad: 2–5 MB shipped per SCORM package — blows out the payload budget ADR 0002 locks in.
- Bad: weak touch / mobile.

### C — Ace Editor

- Bad: older API; smaller community; weaker modularity than CM6.
- Bad: Ace was CodeMirror's predecessor at Cloud9; CM6 is the direct generational successor and the current momentum is there.

### D — `<textarea>` + Shiki

- Good: ~0 KB editor code.
- Bad: no IntelliSense, no indentation-aware editing, no line numbers. Breaks the Educative-style UX we aspire to.
- Verdict: we do use `<textarea>` for a read-only "Shiki-highlighted code block with a Copy button" (different component, different UX).

## Monaco usage policy

- Monaco is allowed only on pages under `/ide/*`.
- The packager refuses to include Monaco in a SCORM or cmi5 target unless the course manifest opts in with `allowHeavyIDE: true` and the build warns about
  the package size.
- Monaco's language services are loaded dynamically — the base IDE page is ~500 KB; language services load on demand.

## Validation

- **Bundle size CI gate:** the default `<RunnablePython>` component + editor budget is 300 KB gzipped, CI-enforced.
- **Mobile test:** Playwright tests drive a Pixel emulation profile; editor accepts input, soft keyboard, selection.
- **RF grammar tests:** a table-driven test covers RF's `*** Settings ***` / `*** Variables ***` / `*** Keywords ***` / `*** Test Cases ***` section
  parsing, pipe-separated and space-separated syntaxes, continuation lines, and embedded variables.
- **Monaco IDE page** loads under 3 seconds on cold cache and does not appear in the default SCORM package output.

## More Information

- Research §4.2 "JavaScript/TypeScript — decision matrix" (Editor row).
- CodeMirror 6: https://codemirror.net/.
- Monaco: https://microsoft.github.io/monaco-editor/.
- Related ADRs: 0002 (foundation & bundle constraints), 0006 (Pyodide), 0007 (Sandpack).
- Open question: if the upstream CM6 `@codemirror/lang-yaml` package becomes richer, switch to it from the community grammar. Track upstream.
