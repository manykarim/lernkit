# SCORM 1.2 XSD schemas (bundled alongside manifests)

This directory holds the four ADLNet SCORM 1.2 Content Aggregation Model schema files that some strict LMSes expect to find co-resident with the package's `imsmanifest.xml`. When present, the packager copies them into the zip root; when absent, the packager still produces a valid zip (SCORM Cloud, Rustici Engine, and recent Moodle tolerate their absence — see research §3.2).

## Files that should live here

| File | Origin |
|---|---|
| `imscp_rootv1p1p2.xsd` | IMS Content Packaging |
| `imsmd_rootv1p2p1.xsd` | IMS Learning Object Metadata |
| `adlcp_rootv1p2.xsd` | ADL Content Packaging extension |
| `ims_xml.xsd` | Supporting XML base types |

All four are freely redistributable from the ADL SCORM 1.2 Content Aggregation Model download. They are not checked into this repository because they belong upstream, not to Lernkit.

## How to populate

1. Download the ADL SCORM 1.2 CAM zip from the ADL distribution mirror.
2. Extract the four files above into this directory.
3. Rebuild `@lernkit/packagers` — the `copy-assets.mjs` post-build step bundles them into `dist/scorm12/schemas/`.

## Legal

These schemas ship under the original ADLNet license. Including them in a downstream SCORM package is explicitly permitted by the SCORM specification and is the intended distribution model.
