# Packaging & Export — Context Model

## Purpose

Transform one build (`dist/` + unified manifest + Tracker Adapter bundle) into five distribution artifacts — `scorm12.zip`, `scorm2004-4th.zip`, `cmi5.zip`, `xapi-bundle/`, `plain/` — plus a PDF produced by [PDF Rendering](./pdf-rendering.md) (Research §3.5). This context owns every LMS-portability quirk (zip layout invariants, manifest rendering, asset URL rewriting, SCORM 1.2 `suspend_data` caps) so that no spec detail leaks upstream into Authoring or Rendering.

## Aggregates

- **CoursePackage** — the packaged artifact for one `PackageKind`. Aggregate root because all of its parts (static assets, manifest, Adapter bundle, launch shim) must satisfy co-invariants (e.g. manifest references exist in the zip).
- **Manifest** — a CoursePackage part with its own validation lifecycle (`imsmanifest.xml` or `cmi5.xml`). Aggregate because the manifest and the ActivityTree must be internally consistent.

## Entities

- _PackageBuild_ — one invocation of the packager for one PackageKind (has an id, timestamp, source commit).
- _Template_ — the Nunjucks template instance for a specific Manifest type.

## Value objects

- *PackageKind* — `scorm12 | scorm2004-4th | cmi5 | xapi | plain`
- *ImsManifest* — rendered SCORM manifest XML
- *Cmi5Xml* — rendered cmi5 course structure XML
- *ActivityTree* — course / module / lesson hierarchy serialized for the manifest
- *AssetRewrite* — rule set for URL transforms (absolute → package-relative)
- *ZipLayout* — invariant-bearing structural descriptor (manifest-at-root, no `__MACOSX/`, no `.DS_Store`, UTF-8 filenames) (Research §3.2)
- *SuspendDataBudget* — `{maxChars: 4096 | 64000}` per PackageKind
- *LaunchShim* — the tiny JS entrypoint that wires the chosen Adapter to the runtime API (`scorm-again` stub, cmi5 fetch, etc.)

## Domain events

- `PackageBuildRequested`
- `ManifestRendered`
- `AssetsRewritten`
- `ZipAssembled`
- `ZipInvariantViolated` — fail-build event (no `__MACOSX/`, manifest-at-root, etc.) (Research §3.2)
- `PackageBuilt` — terminal success
- `PackageRejectedByLms` — optional post-deploy event if SCORM-Cloud CI import fails (Research §3.3 operational rule)

## Application services / use cases

- **BuildPackage(kind)** — orchestrates ManifestRender → AssetRewrite → Adapter bundling → zip assembly for one PackageKind.
- **RenderManifest** — Nunjucks template applied to ActivityTree (Research §3.5).
- **RewriteAssets** — walks `dist/` and rewrites URLs per AssetRewrite rules.
- **ValidateZipLayout** — inspects assembled zip for invariant violations.
- **EmitSuspendDataBudget** — surfaces the *SuspendDataBudget* VO to Tracking's SCORM Adapter so truncation happens in the Adapter, not in the zip.
- **RunConformanceCheck** — optional CI step that uploads the zip to SCORM Cloud and captures pass/fail (Research §3.3).

## Integration with other contexts

- **Upstream — [Authoring](./authoring.md):** consumes the **Published Language** JSON manifest.
- **Upstream — [Content Rendering](./content-rendering.md):** consumes `dist/`.
- **Upstream — [Tracking](./tracking.md):** OHS — picks the correct Adapter bundle per PackageKind.
- **Conformist downstream — external LMSes:** we conform to SCORM 1.2, SCORM 2004 4th Ed, cmi5 specs exactly; we do not negotiate.
- **Downstream — [PDF Rendering](./pdf-rendering.md):** CS — Packaging invokes PDF pipeline alongside zip builders.
- **Downstream — [LMS Launch](./lms-launch.md):** the LaunchShim inside a package calls LMS Launch at learner runtime.

## Invariants and business rules

1. **`imsmanifest.xml` MUST sit at zip root** — the #1 macOS-created SCORM import failure (Research §3.2).
2. **Zips MUST NOT contain `__MACOSX/` or `.DS_Store`** — enforced by `ValidateZipLayout` (Research §3.2).
3. **Filenames MUST be UTF-8** — SCORM 1.2 LMSes are fragile on Windows codepage encodings.
4. **SCORM 1.2 `CoursePackage` MUST bundle `ScormAgainAdapter12`**; never `ScormAgainAdapter2004`.
5. **`SuspendDataBudget` is part of the PackageKind contract**; the number is carried as a VO into Tracking, never hard-coded inside Tracker code.
6. **Absolute asset URLs fail the build unless explicitly allowlisted** — prevents broken resources inside LMS iframes (Research Phase 1 risks).
7. **Each PackageKind has its own idempotent output path** — rebuilding must produce byte-identical zips given identical inputs (for CI reproducibility).
8. **SCORM 1.2 packages MUST declare `schemaversion` 1.2`; SCORM 2004 4th Ed packages MUST declare the 4th Ed namespace** — a single-string swap can otherwise produce silently wrong packages (Research §3.1).
9. **cmi5 packages include `cmi5.xml` at zip root and MAY include assets served from a separate URL** — cmi5 supports fully-qualified content URLs, unlike SCORM (Research §3.1).
10. **`plain` packages have no Adapter (`NoopAdapter`)** — they render but emit no progress.
