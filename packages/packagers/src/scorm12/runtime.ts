/**
 * The SCORM 1.2 runtime loader for packaged lessons.
 *
 * Strategy: we inline a small, self-contained runtime bootstrap into the zip
 * as `lernkit-runtime/scorm12.js`. Phase 1 ships a minimal loader that discovers
 * the LMS's `window.API` up the window chain and exposes it to the page as a
 * `LernkitScorm12` global. Phase 1+: replace with a vendored scorm-again bundle
 * once the legal memo on scorm-again's LGPL posture is back (OQ-P0-12).
 *
 * This keeps the zip self-contained (no CDN dependency — LMS iframes often
 * block third-party origins) and lets us avoid the scorm-again dependency
 * until the license review clears.
 */

import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const RUNTIME_SOURCE = join(here, 'assets', 'scorm12-runtime.js');
const SCHEMAS_DIR = join(here, 'schemas');

/** Where the runtime JS lives inside the produced zip. */
export const RUNTIME_ZIP_PATH = 'lernkit-runtime/scorm12.js';

export async function loadScorm12Runtime(): Promise<Uint8Array> {
  return readFile(RUNTIME_SOURCE);
}

/**
 * Load any bundled SCORM 1.2 XSD schemas (optional).
 *
 * Strict LMSes (older SumTotal, Saba, some SAP SuccessFactors configurations)
 * expect the four ADLNet schemas — imscp_rootv1p1p2.xsd, imsmd_rootv1p2p1.xsd,
 * adlcp_rootv1p2.xsd, ims_xml.xsd — to live alongside imsmanifest.xml.
 * SCORM Cloud, Rustici Engine, and recent Moodle tolerate their absence.
 *
 * This function reads any .xsd files present in `src/scorm12/schemas/`. If the
 * directory is empty or missing, it returns []. See the schemas/README.md for
 * how to populate the directory for strict-LMS distribution.
 */
export async function loadScorm12Schemas(): Promise<ReadonlyArray<{ path: string; body: Uint8Array }>> {
  try {
    const files = await readdir(SCHEMAS_DIR);
    const xsds = files.filter((f) => f.endsWith('.xsd'));
    const loaded: Array<{ path: string; body: Uint8Array }> = [];
    for (const f of xsds) {
      const body = await readFile(join(SCHEMAS_DIR, f));
      // Bundle at the zip root next to imsmanifest.xml (SCORM 1.2 convention).
      loaded.push({ path: f, body });
    }
    return loaded;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

/** Snippet authors inject into their lesson HTML to wire the runtime. */
export const RUNTIME_SCRIPT_TAG = '<script src="lernkit-runtime/scorm12.js"></script>';

/** Path-relative form of the runtime script tag (for nested pages). */
export function runtimeScriptTag(depth: number): string {
  const prefix = depth <= 0 ? '' : '../'.repeat(depth);
  return `<script src="${prefix}lernkit-runtime/scorm12.js"></script>`;
}
