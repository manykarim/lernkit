---
id: index
title: LMS deployment
sidebar_label: Overview
sidebar_position: 1
---

# LMS deployment

This page collects the failure modes we've observed across LMSes and the fix
that made each one work. Most are already handled automatically by the
packager; the matrix is here so you can match a console error to a known
cause when it comes up again.

## Troubleshooting matrix

| Symptom | LMSes seen | Root cause | Fix |
|---|---|---|---|
| `text/plain` MIME refusal on a CSS file | PeopleFluent | Wrong-URL fetch returns the LMS 404 page (served as text/plain) | URL rewrite + persist + harmonise + EC inline (already shipped) |
| 401 on `robotframework-…whl` | SCORM Cloud | `credentials: 'omit'` on the worker fetch | Drop the override; `same-origin` is the fetch default |
| `application/octet-stream` on `pyodide.mjs` | PeopleFluent | LMS file server lacks `.mjs` MIME mapping | Ship `.module.js` companion via `copy-pyodide.mjs` |
| "Preview not supported for structured content" | PeopleFluent | Multi-SCO preview unsupported | Switch to `singleSco: true` |
| "Please make a selection to continue" | SCORM Cloud | Multi-SCO + cross-SCO `<a href>` triggers `LMSFinish` | Switch to `singleSco: true` |
| Code-blocks unstyled (some grammars) | PeopleFluent | `ec.*.css` 404 — ClientRouter cross-depth race bypassed by LMS quirks | Inline EC CSS at packaging |
| log.html: "JavaScript disabled" | Any | iframe sandbox missing `allow-scripts` | `sandbox="allow-scripts allow-same-origin"` |
| Internal navigation triggers full-page reload | Any | `<ClientRouter />` not wired | Add `CustomHead.astro` per [Topology](/packaging/topology) |
| Assets 404 with URL like `<host>/_astro/X` | Any | Root-absolute path leaked through | Verify `rewriteAbsolutePaths` covers the attribute (e.g., `<astro-island component-url>`) |

## Per-LMS notes

:::info Phase 1 stub

Detailed per-LMS quirks (sign-up flow, upload UI, preview behaviour,
known restrictions) for SCORM Cloud, PeopleFluent, Cornerstone, Moodle,
TalentLMS, Docebo, etc. are planned for Phase 2.

:::

For now:

- **SCORM Cloud** has the strictest spec compliance and is the best target
  for early validation. Free tier: 100 MB, 10 registrations.
- **PeopleFluent / Cornerstone / Saba** are stricter on import-time MIME
  and CSP than spec-compliant LMSes; the v10 packager handles the known
  patterns.
- **Moodle / TalentLMS / Docebo** were not stress-tested in Phase 1 but
  follow standard SCORM 1.2 behaviour; expected to work without further
  changes.

## Where to go next

- **[LMS sub-path portability](/packaging/lms-portability)** — the rewrite
  cascade that addresses most of the matrix above.
- **[Packager limitations](/packaging/scorm12)** — the bottom of the
  packager page lists what the v10 build does NOT handle.
