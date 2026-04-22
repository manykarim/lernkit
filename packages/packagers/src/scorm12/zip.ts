import { readFile } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';
import JSZip from 'jszip';

import type { CoursePackage, PackagerOptions } from '../types.js';

/**
 * Zip layout rules for SCORM 1.2 (research §3.2):
 * - `imsmanifest.xml` MUST live at the zip root.
 * - No `__MACOSX/`, `.DS_Store`, `Thumbs.db` — single most common import-failure cause on macOS authors.
 * - Forward-slash separators only (zip spec), not backslash — we normalize on Windows.
 *
 * This module takes the Astro build dist and assembles the zip without ever
 * letting those landmines slip in.
 */

const FORBIDDEN_ENTRIES = /^(__MACOSX\/|.*\/__MACOSX\/|.*\.DS_Store$|.*Thumbs\.db$|.*\.directory$)/;

export interface ZipInput {
  readonly pkg: CoursePackage;
  readonly manifestXml: string;
  readonly runtimeFiles: ReadonlyArray<{ readonly path: string; readonly body: Uint8Array }>;
  readonly options?: PackagerOptions;
}

export async function buildScorm12Zip(input: ZipInput): Promise<{ buffer: Buffer; entries: string[] }> {
  const { pkg, manifestXml, runtimeFiles, options } = input;
  const zip = new JSZip();

  // 1. The manifest at the zip root — non-negotiable.
  zip.file('imsmanifest.xml', manifestXml);

  // 2. SCORM runtime (scorm-again bundle) under a conventional path.
  for (const f of runtimeFiles) {
    if (isForbiddenEntry(f.path)) continue;
    zip.file(toPosix(f.path), f.body);
  }

  // 3. Lesson assets copied verbatim from the Astro build dir.
  const seen = new Set<string>();
  for (const lesson of pkg.lessons) {
    const files = [lesson.href, ...lesson.assets];
    for (const rel of files) {
      const normalised = toPosix(rel);
      if (seen.has(normalised)) continue;
      if (isForbiddenEntry(normalised)) continue;
      if (options?.filter && !options.filter(normalised)) continue;

      const abs = join(pkg.distDir, rel);
      const body = await readFile(abs);
      zip.file(normalised, body);
      seen.add(normalised);
    }
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    // platform=UNIX keeps perms clean; UNIX is the convention SCORM LMSes tolerate best.
    platform: 'UNIX',
  });

  // JSZip synthesises directory entries (e.g. `lernkit-runtime/`) as siblings to files
  // nested under them. For the result contract we expose file entries only — directory
  // placeholders are an implementation detail of the zip format.
  const entries: string[] = [];
  zip.forEach((path, entry) => {
    if (!entry.dir) entries.push(path);
  });

  return { buffer, entries: entries.sort() };
}

export function isForbiddenEntry(path: string): boolean {
  return FORBIDDEN_ENTRIES.test(path);
}

export function toPosix(path: string): string {
  return sep === '/' ? path : path.split(sep).join(posix.sep);
}

/** Compute the recommended zip filename for a course package. */
export function zipFilenameFor(courseId: string, version: string, packagerKind: string): string {
  const safeId = sanitizeFileNamePart(courseId);
  const safeVer = sanitizeFileNamePart(version);
  return `${safeId}-${safeVer}-${packagerKind}.zip`;
}

function sanitizeFileNamePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Compute the zip-root-relative path that a Node absolute path would land at. */
export function posixRelativeTo(base: string, absolute: string): string {
  return toPosix(relative(base, absolute));
}
