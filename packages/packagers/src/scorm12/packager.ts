import { readFile } from 'node:fs/promises';
import { renderScorm12Manifest, renderScorm12Metadata } from './manifest.js';
import { RUNTIME_ZIP_PATH, loadScorm12Runtime, loadScorm12Schemas } from './runtime.js';
import { buildScorm12Zip } from './zip.js';

import type { CoursePackage, PackagerOptions, PackagingResult } from '../types.js';

/**
 * The SCORM 1.2 packager entry point. Consumes a unified CoursePackage VO
 * (see types.ts) and produces a zip blob that imports into any SCORM 1.2 LMS.
 *
 * Conformance touchpoints (research §3.2):
 * - imsmanifest.xml at the zip root — enforced by the zip builder.
 * - No __MACOSX, no .DS_Store — enforced by the zip builder.
 * - imsmanifest.xml declares `schemaversion=1.2` and `schema=ADL SCORM` — enforced by the Nunjucks template.
 * - Every lesson (SCO) lists every file it depends on in its <resource> element — driven by CoursePackage.lessons[i].assets.
 *
 * The runtime JS is injected under `lernkit-runtime/scorm12.js`. Lessons opt
 * into it by including `<script src="lernkit-runtime/scorm12.js"></script>`
 * (relative path depth handled per-lesson by the caller).
 */
export async function packageScorm12(pkg: CoursePackage, options?: PackagerOptions): Promise<PackagingResult> {
  validate(pkg);

  const manifestXml = await renderScorm12Manifest({ pkg });
  const metadataXml = await renderScorm12Metadata({ pkg });

  const runtimeBody = await loadScorm12Runtime();
  const bundledSchemas = await loadScorm12Schemas();
  const runtimeFiles = [{ path: RUNTIME_ZIP_PATH, body: runtimeBody }, ...bundledSchemas];

  const { buffer, entries } = await buildScorm12Zip({
    pkg,
    manifestXml,
    runtimeFiles,
    extraRootFiles: [{ path: 'metadata.xml', body: metadataXml }],
    options,
  });

  return {
    zip: buffer,
    filename: zipFilename(pkg.metadata.courseId, pkg.metadata.version),
    entries,
    manifest: manifestXml,
  };
}

function zipFilename(courseId: string, version: string): string {
  const safeId = courseId.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const safeVer = version.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${safeId}-${safeVer}-scorm12.zip`;
}

function validate(pkg: CoursePackage): void {
  if (!pkg.metadata) throw new Error('CoursePackage is missing metadata');
  if (!pkg.metadata.courseId) throw new Error('CoursePackage.metadata.courseId is required');
  if (!pkg.metadata.title) throw new Error('CoursePackage.metadata.title is required');
  if (!pkg.metadata.version) throw new Error('CoursePackage.metadata.version is required');
  if (!pkg.metadata.language) throw new Error('CoursePackage.metadata.language is required');
  if (!pkg.distDir) throw new Error('CoursePackage.distDir is required');
  if (!pkg.lessons || pkg.lessons.length === 0) {
    throw new Error('CoursePackage.lessons must contain at least one lesson');
  }
  const ids = new Set<string>();
  for (const lesson of pkg.lessons) {
    if (!lesson.id) throw new Error('Every lesson must have an id');
    if (!lesson.href) throw new Error(`Lesson ${lesson.id} is missing href`);
    if (!lesson.title) throw new Error(`Lesson ${lesson.id} is missing title`);
    if (ids.has(lesson.id)) throw new Error(`Duplicate lesson id: ${lesson.id}`);
    ids.add(lesson.id);
  }
  if (pkg.metadata.masteryScore !== undefined && (pkg.metadata.masteryScore < 0 || pkg.metadata.masteryScore > 1)) {
    throw new Error('CoursePackage.metadata.masteryScore must be in [0, 1]');
  }
  if (pkg.metadata.singleSco === true && pkg.metadata.entryLessonId !== undefined) {
    const id = pkg.metadata.entryLessonId;
    const exists = pkg.lessons.some((l) => l.id === id);
    if (!exists) {
      throw new Error(`Lesson with id "${id}" not found; required by metadata.entryLessonId`);
    }
  }
}

/** Tiny helper for callers that already have a built zip and want to write it out. */
export async function writePackageTo(result: PackagingResult, destinationPath: string): Promise<void> {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(destinationPath, result.zip);
}

/** Exposed for a debugging smoke test — reads the first 256 bytes of a built zip to verify PK signature. */
export async function isLikelyZip(filePath: string): Promise<boolean> {
  const fd = await readFile(filePath);
  return fd.length >= 4 && fd[0] === 0x50 && fd[1] === 0x4b && (fd[2] === 0x03 || fd[2] === 0x05);
}
