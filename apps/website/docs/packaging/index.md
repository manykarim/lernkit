---
id: index
title: Packaging — overview
sidebar_label: Overview
sidebar_position: 1
---

# Packaging

Lernkit packages a built course into LMS-importable archives. Today there's
one production-ready packager — **SCORM 1.2** — and four more in the pipeline.

| Format | Status | When to use |
|---|---|---|
| SCORM 1.2 | Shipping (this page) | Universal LMS support; oldest standard but works everywhere |
| SCORM 2004 4th Ed. | Planned | When you need sequencing, prerequisites, multiple completion rules |
| xAPI bundle | Planned | When you have a Learning Record Store (LRS), not a SCORM-only LMS |
| cmi5 | Planned | Modern xAPI + assignable units; the future-facing path |
| Plain HTML | Planned | Self-hosting; no LMS at all |

All formats consume the same unified `CoursePackage` input shape. Switching
formats means swapping the packager call, not re-authoring the course.

```ts
import { packageScorm12 } from '@lernkit/packagers';
// future:
// import { packageScorm2004, packageXapiBundle, packageCmi5, packagePlainHtml } from '@lernkit/packagers';
```

## Where to go next

- **Build a SCORM 1.2 zip → [SCORM 1.2 packaging](/packaging/scorm12)**.
- **Choose single-SCO vs multi-SCO → [Topology](/packaging/topology)**.
- **Diagnose LMS-specific failures → [LMS portability](/packaging/lms-portability)**.
- **API reference → [@lernkit/packagers](/api/packagers)**.
