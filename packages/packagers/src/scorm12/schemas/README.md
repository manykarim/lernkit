# SCORM 1.2 XSD schemas (bundled into every package zip by default)

This directory holds the four ADLNet SCORM 1.2 Content Aggregation Model schemas. The packager's `loadScorm12Schemas()` reads any `.xsd` file present here and ships it at the zip root so importers that follow `xsi:schemaLocation` from `imsmanifest.xml` can resolve them.

## Bundled files

| File | Origin | Used by |
|---|---|---|
| `imscp_rootv1p1p2.xsd` | IMS Content Packaging | `<manifest>`, `<organizations>`, `<resources>`, `<file>` |
| `imsmd_rootv1p2p1.xsd` | IMS Learning Object Metadata | external `metadata.xml` |
| `adlcp_rootv1p2.xsd` | ADL Content Packaging extension | `adlcp:scormtype`, `adlcp:masteryscore`, `adlcp:location` |
| `ims_xml.xsd` | Supporting XML base types | imported by the others |

All four are freely redistributable from the ADL SCORM 1.2 Content Aggregation Model download. The license explicitly permits inclusion in downstream SCORM packages — that is the intended distribution model.

## Why ship them

Older / strict LMS importers — SumTotal, Saba, certain SAP SuccessFactors builds — run XSD validation on import and follow the `xsi:schemaLocation` references. Resolving those URIs to local files in the zip root (`adlcp_rootv1p2.xsd` etc.) is the difference between import-success and import-failure for those products. SCORM Cloud, Rustici Engine, recent Moodle, Articulate, and most modern web LMSes tolerate their absence — but bundling costs ~10 KB compressed and never hurts compatibility.

## To omit them

Delete the `.xsd` files from this directory and rebuild. `loadScorm12Schemas()` returns `[]` when the directory is empty, and the packager skips the bundling step. The manifest still references the schemas via `xsi:schemaLocation`, but lenient importers ignore the missing files.

## Provenance

The four files were sourced from the ADLNet SCORM 1.2 Content Aggregation Model distribution (preserved verbatim — bytes match the schemas shipped inside reference SCORM 1.2 packages from EasyGenerator and other major authoring tools). They are byte-stable across all reputable SCORM 1.2 authoring tools; there is no v1.2.1 of these schemas. Re-fetching them is only needed if a future SCORM 1.2 spec revision is published, which is not expected.
