#!/usr/bin/env node
/**
 * Post-build step for the docs app: packages the built Astro site as a SCORM 1.2
 * course zip and writes it to `dist-packages/scorm12/`.
 *
 * Phase 1 implementation: conservative asset discovery (ships every file in
 * `_astro/` to every lesson SCO). Phase 1+ will read Astro's build manifest to
 * trim per-lesson asset lists precisely.
 *
 * Usage:
 *   pnpm --filter=@lernkit/docs build:scorm12
 *
 * The caller is expected to run `astro build` first (or use the combined
 * `build:scorm12` script in this app's package.json).
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { packageScorm12 } from '@lernkit/packagers';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const distDir = join(appRoot, 'dist');
const outDir = join(appRoot, 'dist-packages', 'scorm12');

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

async function discoverLessons() {
  const courseRoot = join(distDir, 'course');
  const stats = await stat(courseRoot).catch(() => null);
  if (!stats?.isDirectory()) {
    throw new Error(
      `Expected a built course at ${courseRoot}. Did you run \`pnpm --filter=@lernkit/docs build\` first?`,
    );
  }
  const dirs = (await readdir(courseRoot, { withFileTypes: true })).filter((e) => e.isDirectory());
  const lessons = [];
  for (const d of dirs) {
    const lessonRoot = join(courseRoot, d.name);
    const indexPath = join(lessonRoot, 'index.html');
    const indexStat = await stat(indexPath).catch(() => null);
    if (!indexStat?.isFile()) continue;
    const html = await readFile(indexPath, 'utf8');
    const lessonFiles = await walkFiles(lessonRoot);
    const sharedAstroDir = join(distDir, '_astro');
    const sharedExists = await stat(sharedAstroDir).catch(() => null);
    const sharedFiles = sharedExists ? await walkFiles(sharedAstroDir).then((xs) => xs.map((x) => `_astro/${x}`)) : [];
    lessons.push({
      id: d.name,
      title: titleFromHtml(html, d.name),
      href: `course/${d.name}/index.html`,
      assets: [...sharedFiles, ...lessonFiles.filter((f) => f !== 'index.html').map((f) => `course/${d.name}/${f}`)],
    });
  }
  lessons.sort((a, b) => a.id.localeCompare(b.id));
  return lessons;
}

async function main() {
  const pkgJson = await readJson(join(appRoot, 'package.json'));
  const lessons = await discoverLessons();
  if (lessons.length === 0) {
    throw new Error(`No lessons discovered under ${distDir}/course/. Nothing to package.`);
  }

  const result = await packageScorm12({
    metadata: {
      courseId: 'lernkit-sample-course',
      title: 'Lernkit — Sample Course',
      description: 'Phase 0 sample course packaged as SCORM 1.2 for LMS import smoke-testing.',
      version: pkgJson.version || '0.0.0',
      language: 'en',
      organization: { name: 'Lernkit', identifier: 'lernkit' },
      masteryScore: 0.8,
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
  console.log(`  lessons:  ${lessons.length}`);
  console.log(`  entries:  ${result.entries.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
