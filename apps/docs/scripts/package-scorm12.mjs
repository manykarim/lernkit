#!/usr/bin/env node
/**
 * Post-build step for the docs app: packages the built Astro site as a SCORM 1.2
 * course zip and writes it to `dist-packages/scorm12/`.
 *
 * Supports multiple courses inside one Astro build by parameterising the course
 * root via environment variables. The default invocation packages the Lernkit
 * sample course under `dist/course/`; other courses (like the RF training at
 * `dist/rf-training/`) are packaged via env overrides:
 *
 *   COURSE_ROOT_DIR=rf-training \
 *     COURSE_ID=rf-training \
 *     COURSE_TITLE="Robot Framework Training" \
 *     COURSE_DESCRIPTION="..." \
 *     COURSE_MASTERY_SCORE=0.7 \
 *     node scripts/package-scorm12.mjs
 *
 * Optional flag: INCLUDE_PYODIDE_RUNTIME=1
 *   When set, the packager also bundles `dist/pyodide/` (Pyodide core + any
 *   RF wheels in `pyodide/wheels/`) into the zip as shared assets. Required
 *   for SCORM courses that contain <RunnablePython> or <RunnableRobot> cells
 *   and will be delivered to an LMS that has no network access to the
 *   hosted origin (offline-capable SCORM delivery). Adds ~13-14 MB to the
 *   final zip.
 *
 * Lesson discovery recurses through `dist/<COURSE_ROOT_DIR>/` looking for every
 * `index.html`. Lesson IDs are derived from the relative directory path so a
 * nested course (like rf-training with section-N subfolders) keeps its ordering
 * stable and LMS-friendly.
 *
 * Asset discovery is still conservative (ships every file in `_astro/` to every
 * lesson SCO). Phase 1+ will read Astro's build manifest to trim per-lesson
 * asset lists precisely.
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { packageScorm12 } from '@lernkit/packagers';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const distDir = join(appRoot, 'dist');

const COURSE_ROOT_DIR = process.env.COURSE_ROOT_DIR ?? 'course';
const COURSE_ID = process.env.COURSE_ID ?? 'lernkit-sample-course';
const COURSE_TITLE = process.env.COURSE_TITLE ?? 'Lernkit — Sample Course';
const COURSE_DESCRIPTION =
  process.env.COURSE_DESCRIPTION ??
  'Phase 0 sample course packaged as SCORM 1.2 for LMS import smoke-testing.';
const COURSE_LANGUAGE = process.env.COURSE_LANGUAGE ?? 'en';
const COURSE_MASTERY_SCORE = process.env.COURSE_MASTERY_SCORE
  ? Number.parseFloat(process.env.COURSE_MASTERY_SCORE)
  : 0.8;
const COURSE_VERSION = process.env.COURSE_VERSION ?? null; // fallback = app version
const INCLUDE_PYODIDE_RUNTIME = isTruthy(process.env.INCLUDE_PYODIDE_RUNTIME);

const outDir = join(appRoot, 'dist-packages', 'scorm12');

function isTruthy(v) {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function walkFiles(root, acc = [], base = root) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(full, acc, base);
    } else if (entry.isFile()) {
      acc.push(toPosix(relative(base, full)));
    }
  }
  return acc;
}

function toPosix(p) {
  return sep === '/' ? p : p.split(sep).join('/');
}

function titleFromHtml(html, fallback) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].trim() : fallback;
}

/** Discover every `index.html` under `dist/<rootDir>/`, including nested subfolders. */
async function findLessonIndexes(courseRoot, acc = []) {
  const entries = await readdir(courseRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sub = join(courseRoot, entry.name);
    const idx = join(sub, 'index.html');
    const idxStat = await stat(idx).catch(() => null);
    if (idxStat?.isFile()) acc.push(sub);
    await findLessonIndexes(sub, acc);
  }
  return acc;
}

function slugFromRelPath(relPath) {
  // 'section-1-getting-started/1-1-install-python' → 's1-getting-started__1-1-install-python'
  // Safe for SCORM identifiers: [a-zA-Z0-9._-].
  return relPath.replace(/\//g, '__').replace(/[^a-zA-Z0-9._-]+/g, '-');
}

async function discoverLessons() {
  const courseRoot = join(distDir, COURSE_ROOT_DIR);
  const stats = await stat(courseRoot).catch(() => null);
  if (!stats?.isDirectory()) {
    throw new Error(
      `Expected a built course at ${courseRoot}. Did you run \`pnpm --filter=@lernkit/docs build\` first?`,
    );
  }

  const sharedAstroDir = join(distDir, '_astro');
  const sharedExists = await stat(sharedAstroDir).catch(() => null);
  const sharedAstroFiles = sharedExists
    ? await walkFiles(sharedAstroDir).then((xs) => xs.map((x) => `_astro/${x}`))
    : [];

  // Optionally bundle the Pyodide runtime (ADR 0006) so the SCORM zip is
  // self-contained for offline LMS delivery. Adds ~13-14 MB to the zip.
  const sharedPyodideFiles = [];
  let pyodideBytes = 0;
  if (INCLUDE_PYODIDE_RUNTIME) {
    const pyodideDir = join(distDir, 'pyodide');
    const pyodideExists = await stat(pyodideDir).catch(() => null);
    if (!pyodideExists?.isDirectory()) {
      throw new Error(
        `INCLUDE_PYODIDE_RUNTIME=1 but ${pyodideDir} does not exist. ` +
          'Did you run the Astro build (which runs copy-pyodide.mjs via prebuild)?',
      );
    }
    const files = await walkFiles(pyodideDir);
    for (const f of files) {
      sharedPyodideFiles.push(`pyodide/${f}`);
      pyodideBytes += (await stat(join(pyodideDir, f))).size;
    }
  }

  const sharedFiles = [...sharedAstroFiles, ...sharedPyodideFiles];

  // Include the course root itself if it has an index.html (course overview page).
  const rootIdx = join(courseRoot, 'index.html');
  const rootIdxStat = await stat(rootIdx).catch(() => null);
  const lessonDirs = await findLessonIndexes(courseRoot);
  if (rootIdxStat?.isFile()) lessonDirs.unshift(courseRoot);

  const lessons = [];
  for (const lessonRoot of lessonDirs) {
    const rel = toPosix(relative(distDir, lessonRoot));
    const indexPath = join(lessonRoot, 'index.html');
    const html = await readFile(indexPath, 'utf8');
    const lessonFiles = await walkFiles(lessonRoot);
    const lessonFilesForZip = lessonFiles.map((f) => `${rel}/${f}`);
    lessons.push({
      id: slugFromRelPath(relative(join(distDir, COURSE_ROOT_DIR), lessonRoot) || 'overview'),
      title: titleFromHtml(html, rel),
      href: `${rel}/index.html`,
      assets: [...sharedFiles, ...lessonFilesForZip.filter((f) => f !== `${rel}/index.html`)],
    });
  }

  // Stable, human-readable ordering by relative path so sections/chapters appear in order.
  lessons.sort((a, b) => a.href.localeCompare(b.href));
  return lessons;
}

async function main() {
  const pkgJson = await readJson(join(appRoot, 'package.json'));
  const lessons = await discoverLessons();
  if (lessons.length === 0) {
    throw new Error(
      `No lessons discovered under ${distDir}/${COURSE_ROOT_DIR}/. Nothing to package.`,
    );
  }

  const result = await packageScorm12({
    metadata: {
      courseId: COURSE_ID,
      title: COURSE_TITLE,
      description: COURSE_DESCRIPTION,
      version: COURSE_VERSION ?? pkgJson.version ?? '0.0.0',
      language: COURSE_LANGUAGE,
      organization: { name: 'Lernkit', identifier: 'lernkit' },
      masteryScore: COURSE_MASTERY_SCORE,
    },
    lessons,
    distDir,
  });

  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, result.filename);
  await writeFile(outFile, result.zip);

  console.log(`SCORM 1.2 package written:`);
  console.log(`  file:     ${outFile}`);
  console.log(`  size:     ${(result.zip.byteLength / 1024).toFixed(1)} KB`);
  console.log(`  courseId: ${COURSE_ID}`);
  console.log(`  root:     dist/${COURSE_ROOT_DIR}/`);
  console.log(`  lessons:  ${lessons.length}`);
  console.log(`  entries:  ${result.entries.length}`);
  console.log(`  pyodide:  ${INCLUDE_PYODIDE_RUNTIME ? 'bundled' : 'not bundled'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
