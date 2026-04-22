---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0016 — Embed H5P content via h5p-standalone for long-tail interaction types

## Context and Problem Statement

Research §1.2 documents ~55 H5P content types under a mix of MIT (core) and GPL (some types). The framework's native component library covers the top 15
patterns (research §1.4) and the dominant interactions for technical training, but reimplementing the long tail — Virtual Tour 360, Branching Scenario,
Dictation, Speak the Words, Memory Game, Crossword, Find the Hotspot, Image Juxtaposition, Dialog Cards, Documentation Tool, Agamotto, Personality Quiz,
Arithmetic Quiz, Essay, Questionnaire, etc. — is a multi-year effort with minimal differentiating value. H5P already ships all of them.

## Decision Drivers

- **Breadth without reimplementation.** Covering ~55 content types natively is ~55 components to design, test, and maintain.
- **H5P author tooling maturity.** Instructional designers often already have `.h5p` packages from Drupal / Moodle / WordPress workflows; they should be
  usable as-is.
- **Interop with existing H5P xAPI events.** H5P content types emit xAPI via H5P's `EventDispatcher`; those events should route into our Tracker transparently.
- **License.** The chosen embedding library must be MIT-compatible with our MIT core (ADR 0014).
- **Print fallback.** H5P content renders in an iframe; print / PDF must degrade gracefully.

## Considered Options

- **A:** `<H5P src="content.h5p" />` component wrapping `h5p-standalone` (tunapanda, MIT).
- **B:** Reimplement each needed H5P content type as a native MDX component.
- **C:** Host H5P via Drupal / Moodle H5P plugin and iframe-embed from there.
- **D:** Do not support H5P at all.

## Decision Outcome

Chosen option: **A — Ship a `<H5P src="path/to/content.h5p" />` MDX component that wraps `h5p-standalone` (MIT) to render any `.h5p` package inside a lesson,
forwarding H5P xAPI events into the framework's Tracker (ADR 0004).**

### Component contract

```mdx
<H5P src="/h5p/virtual-tour-intro.h5p"
     options={{ frameJs: "/h5p/dist/frame.bundle.js" }}
     trackAs="activity-slug" />
```

- `src` — path to a `.h5p` zip bundled under `public/h5p/`.
- `options` — passthrough to `h5p-standalone` (frame JS path, CSS, i18n).
- `trackAs` — the activity ID used when forwarding H5P xAPI events to the Tracker. Derived from the lesson slug + content name if omitted.

### xAPI event forwarding

`h5p-standalone` exposes an event subscription API. The `<H5P>` component subscribes to `xAPI` events from every contained content type and calls
`tracker.recordInteraction()` / `tracker.setScore()` / `tracker.complete()` on our `Tracker`, translating H5P's statement shape to the framework's
`Interaction` shape. Credentials stay server-side; H5P statements route through the same `/xapi` proxy (ADR 0013).

### License handling

- `h5p-standalone` is MIT — compatible with ADR 0014.
- Individual H5P **content types** may be GPL — but authors embed their own `.h5p` packages, so the GPL content lives in customer assets, not in our core
  shipped bundle. We document this to customers.

### Print fallback

Per ADR 0011, every interactive component provides a print snapshot. The `<H5P>` component's print mode renders:

1. A static screenshot (generated at build time via Playwright against the `h5p-standalone` rendered output).
2. A QR code to the live URL.
3. A brief text description extracted from the `h5p.json` metadata.

### SCORM / cmi5 packaging

The `.h5p` files are static assets — they travel inside the output zip under `/h5p/` and load from the package's own origin (no external calls). This works
because H5P content inside `h5p-standalone` is self-contained after extraction.

### Security

- H5P content runs inside an iframe with `sandbox="allow-scripts"` (no `allow-same-origin`) — isolates H5P content JS from the host page.
- The `h5p-standalone` runtime is vendored and pinned; upgrades are tracked in the changelog because some H5P content types have had historical XSS reports.
- All `.h5p` files shipped with a course are content-hashed and validated at build time (no untrusted uploads at runtime in the default tier).

### Consequences

- **Functionality, good:** the framework claims breadth equal to H5P's ~55 content types without reimplementing them.
- **Functionality, good:** instructional designers with existing `.h5p` libraries are unblocked on day one.
- **Portability, good:** `.h5p` is a zip format — fits naturally inside our SCORM/cmi5 package outputs.
- **Performance, mixed:** every `<H5P>` instance ships the `h5p-standalone` runtime + the content type JS. A lesson with five different H5P types ships five
  content-type runtimes. We document this cost; courses heavy on H5P pay for it.
- **Security, good:** iframe sandboxing without `allow-same-origin` isolates content types.
- **Security, note:** GPL content types ship inside customer zips; customers redistributing modified versions inherit GPL obligations — documented.
- **Clarity, good:** one component, one `src` attribute, one `trackAs` for xAPI routing.
- **Testability, good:** the xAPI forwarding is unit-testable against a stubbed `h5p-standalone` event stream.

## Pros and Cons of the Options

### A — h5p-standalone embed — chosen

- Good: delivers H5P-level breadth without building it.
- Good: authors use existing `.h5p` files; no new toolchain.
- Good: MIT-licensed; compatible with core.
- Bad: iframe sandboxing adds layout complexity; H5P's own responsive behavior must be respected.

### B — Reimplement each H5P type

- Bad: multi-year work for low-ROI content types.
- Bad: duplicates well-tested H5P implementations.

### C — Drupal / Moodle H5P iframe from external host

- Bad: external dependency; breaks offline SCORM.
- Bad: introduces cross-origin concerns and credentials for a separate service.

### D — No H5P support

- Bad: cuts off a large library of existing instructional content and existing authoring workflows.

## Validation

- **Round-trip xAPI test:** an H5P "Multiple Choice" content emits a correct-answer xAPI event; the `<H5P>` wrapper forwards it; `tracker.recordInteraction`
  is called with the correct shape; the LRS receives one statement.
- **Packaging test:** a course with two H5P embeds builds a SCORM 1.2 zip; launching in SCORM Cloud loads both H5P instances without external network calls.
- **Iframe isolation test:** a deliberately hostile `.h5p` content type cannot access `window.parent` from inside the H5P iframe (Playwright test).
- **Print fallback test:** PDF export of a lesson with an H5P embed produces a labeled screenshot + QR code, not a blank area.

## More Information

- Research §1.2 "H5P is the reference".
- Research §6.10 "Long-tail content types via H5P embed".
- `h5p-standalone`: https://github.com/tunapanda/h5p-standalone.
- H5P core / content types: https://h5p.org/ and https://github.com/h5p/.
- Related ADRs: 0004 (Tracker), 0011 (print fallback), 0013 (xAPI proxy), 0015 (packaging pipeline).
- Open question: do we ship a curated "blessed H5P content-type list" tested in our pipeline, or leave the full ~55 to customers? Recommend the former for
  Phase 3 — covers Branching Scenario, Interactive Video, Memory Game, Crossword, Documentation Tool.
