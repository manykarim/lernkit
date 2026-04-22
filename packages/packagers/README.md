# @lernkit/packagers

Standards packagers for Lernkit. **Phase 1 ships SCORM 1.2.** cmi5, SCORM 2004 4th Ed, xAPI bundle, and plain-HTML follow in later phases per [ADR 0015](../../docs/adr/0015-one-source-many-outputs-build-pipeline.md).

## What it does

Takes a built static site — typically the `dist/` output of the Astro docs app — and a `CoursePackage` descriptor, and produces a conformant zip that imports into any SCORM 1.2 LMS.

The zip layout follows SCORM 1.2 conformance rules from research §3.2:

```
lernkit-sample-course-0.0.0-scorm12.zip
├── imsmanifest.xml                  ← at zip root (non-negotiable)
├── lernkit-runtime/scorm12.js       ← in-browser SCORM API bridge
├── _astro/                          ← shared bundle (CSS/JS)
└── course/<lesson-id>/index.html    ← one HTML per SCO
```

No `__MACOSX/`, no `.DS_Store`, no wrapper directory — the three most common import-failure causes.

## Usage

```ts
import { packageScorm12 } from '@lernkit/packagers';
import { writeFile } from 'node:fs/promises';

const result = await packageScorm12({
  metadata: {
    courseId: 'intro-to-python',
    title: 'Intro to Python',
    version: '0.1.0',
    language: 'en',
    organization: { name: 'Lernkit' },
    masteryScore: 0.8,
  },
  lessons: [
    {
      id: 'welcome',
      title: 'Welcome',
      href: 'course/welcome/index.html',
      assets: ['_astro/shared.css'],
    },
  ],
  distDir: './apps/docs/dist',
});

await writeFile(result.filename, result.zip);
// Output: intro-to-python-0.1.0-scorm12.zip
```

## Conformance notes

- Produces a manifest declaring `<schema>ADL SCORM</schema>` and `<schemaversion>1.2</schemaversion>`.
- Uses the three required namespaces: `imscp_rootv1p1p2`, `adlcp_rootv1p2`, `imsmd_rootv1p2p1`.
- Every lesson resource is marked `adlcp:scormtype="sco"` and lists every file it depends on.
- Optional mastery threshold emits `<adlcp:masteryscore>N</adlcp:masteryscore>` (integer percent).

## Bundled runtime

The zip ships `lernkit-runtime/scorm12.js` — a ~5 KB browser bootstrap that walks up the window chain to find the LMS's `window.API`, handles the `HH:MM:SS.SS` `session_time` format, and enforces the 4 KB `cmi.suspend_data` cap. Lesson HTML loads it via `<script src="lernkit-runtime/scorm12.js"></script>`.

Consumption pattern from lesson code (via [`@lernkit/tracker`](../tracker)):

```ts
import { LernkitScorm12Adapter } from '@lernkit/tracker/adapters/scorm12';

const tracker = new LernkitScorm12Adapter();
await tracker.init();
await tracker.setScore({ scaled: 0.9 });
await tracker.complete();
await tracker.pass();
await tracker.terminate();
```

### scorm-again migration

The bundled runtime is deliberately minimal. Per [ADR 0005](../../docs/adr/0005-scorm-again-as-primary-lms-api-wrapper.md), the production choice is `scorm-again` — gated on the fixed-scope legal memo for its LGPL-3 / MIT mixed licensing ([OQ-P0-12](../../docs/plan/10-open-questions.md)). When the memo clears, the packager will swap to a vendored scorm-again bundle with the same `window.LernkitScorm12` shape; downstream code does not change.

## Optional: bundle the ADL SCORM 1.2 XSDs

Strict LMSes (older SumTotal, Saba, some SAP SuccessFactors configs) expect the four ADL CAM schemas co-resident with `imsmanifest.xml`. Drop them into `src/scorm12/schemas/` and the packager ships them at the zip root automatically:

- `imscp_rootv1p1p2.xsd`
- `imsmd_rootv1p2p1.xsd`
- `adlcp_rootv1p2.xsd`
- `ims_xml.xsd`

SCORM Cloud, Rustici Engine, and recent Moodle tolerate their absence. See `src/scorm12/schemas/README.md` for the population procedure.

## Testing

```bash
pnpm --filter=@lernkit/packagers test         # vitest
pnpm --filter=@lernkit/packagers typecheck    # tsc --noEmit
pnpm --filter=@lernkit/packagers build        # emit dist/
```

End-to-end (from repo root):

```bash
pnpm build:scorm12
# Writes apps/docs/dist-packages/scorm12/lernkit-sample-course-0.0.0-scorm12.zip
```

Verify structure:

```bash
ZIP=apps/docs/dist-packages/scorm12/lernkit-sample-course-0.0.0-scorm12.zip
unzip -l "$ZIP" | head
unzip -p "$ZIP" imsmanifest.xml | head -15
unzip -tq "$ZIP" && echo "zip OK"
```

## Limitations in Phase 1

- No real SCORM Cloud CI round-trip yet (needs a credential; OQ-P0-12 batches this with the legal memo).
- No Moodle / TalentLMS / Docebo smoke test — those arrive in Phase 3 per [`02-phase-plan.md`](../../docs/plan/02-phase-plan.md).
- Asset discovery in the reference docs-app script (`apps/docs/scripts/package-scorm12.mjs`) is conservative — it bundles every file under `_astro/` to every SCO. Phase 1+ will consume Astro's build manifest to trim per-lesson asset lists precisely.
- `recordInteraction` is buffered in the adapter but not yet written to `cmi.interactions.N` (many LMSes silently drop interactions; Phase 1+ wires it once we have a real LMS to verify).

## Related ADRs

- [ADR 0003](../../docs/adr/0003-prioritize-cmi5-and-scorm-1-2-with-2004-opt-in.md) — standards strategy.
- [ADR 0004](../../docs/adr/0004-unified-tracker-interface-with-pluggable-adapters.md) — Tracker interface.
- [ADR 0005](../../docs/adr/0005-scorm-again-as-primary-lms-api-wrapper.md) — chosen runtime wrapper.
- [ADR 0015](../../docs/adr/0015-one-source-many-outputs-build-pipeline.md) — the build pipeline shape.
