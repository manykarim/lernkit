#!/usr/bin/env node
/**
 * Downloads and vendors the Robot Framework wheel for self-host installation
 * into Pyodide (ADR 0024). No runtime PyPI fetches — the worker installs from
 * the same-origin `/pyodide/wheels/` directory only.
 *
 * Pins version + SHA-256 hash to prevent supply-chain drift. Idempotent: skips
 * the download when the file already exists with the expected hash.
 *
 * Runs from `apps/docs/package.json` `prebuild:wheels` script.
 */

import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const wheelsDir = join(appRoot, 'public', 'pyodide', 'wheels');

/**
 * Pinned wheel manifest. Each entry:
 *  - filename: what to write in wheels/
 *  - url: canonical PyPI CDN URL
 *  - sha256: published integrity digest
 *
 * Add new entries when introducing additional pure-Python libraries (e.g.
 * robotframework-jsonlibrary). Server-only libs (Browser, SeleniumLibrary) stay out.
 */
const WHEELS = [
  {
    filename: 'robotframework-7.4.2-py3-none-any.whl',
    url: 'https://files.pythonhosted.org/packages/ef/35/fd2385b15f6d814f1801bcbd3d54b4c61a1bfc3a1a0fe023dc15551c5fe4/robotframework-7.4.2-py3-none-any.whl',
    sha256: '6e80f84cdc997bdde2abb6b729ac3531457ecf6d2e41abfb87a541877ab367bf',
  },
];

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function sha256(path) {
  const hash = createHash('sha256');
  const bytes = await readFile(path);
  hash.update(bytes);
  return hash.digest('hex');
}

async function downloadOne({ filename, url, sha256: expected }) {
  const dst = join(wheelsDir, filename);
  if (await exists(dst)) {
    const got = await sha256(dst);
    if (!expected || got === expected) {
      console.log(`[rf-wheels] ${filename} already present — skip`);
      return { filename, size: (await stat(dst)).size, sha256: got, cached: true };
    }
    console.log(`[rf-wheels] ${filename} present but sha mismatched — re-downloading`);
  }

  console.log(`[rf-wheels] downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed ${response.status} ${response.statusText} — ${url}`);
  }
  await mkdir(wheelsDir, { recursive: true });

  const file = createWriteStream(dst);
  await pipeline(response.body, file);

  const got = await sha256(dst);
  const size = (await stat(dst)).size;
  if (expected && got !== expected) {
    throw new Error(
      `[rf-wheels] SHA-256 mismatch for ${filename}\n  expected: ${expected}\n  got:      ${got}`,
    );
  }
  console.log(`[rf-wheels] wrote ${filename} (${(size / 1024).toFixed(1)} KB, sha256 ${got})`);
  return { filename, size, sha256: got, cached: false };
}

async function main() {
  if (WHEELS.length === 0) {
    console.log('[rf-wheels] no wheels configured — nothing to do');
    return;
  }
  const results = [];
  for (const w of WHEELS) {
    results.push(await downloadOne(w));
  }

  // Emit a manifest JSON next to the wheels so the runtime can discover what
  // is available without directory-listing gymnastics.
  const { writeFile } = await import('node:fs/promises');
  const manifestPath = join(wheelsDir, 'manifest.json');
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        wheels: results.map(({ filename, size, sha256: hash }) => ({ filename, size, sha256: hash })),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`[rf-wheels] manifest written to ${manifestPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
