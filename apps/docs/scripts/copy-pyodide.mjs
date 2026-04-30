#!/usr/bin/env node
/**
 * Copies the Pyodide runtime bundle from node_modules to public/pyodide/ so
 * Astro serves it from the same origin. Required by ADR 0006 (self-host
 * Pyodide; never jsDelivr).
 *
 * Idempotent and cheap — runs as a prebuild step. If `node_modules/pyodide`
 * doesn't exist yet (first clone, pre-install) it exits 0 with a notice; the
 * real `pnpm install` populates it.
 */

import { copyFile, cp, mkdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const src = join(appRoot, 'node_modules', 'pyodide');
const dst = join(appRoot, 'public', 'pyodide');

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(src))) {
    console.log(`[copy-pyodide] ${src} not found — skipping (run \`pnpm install\` first).`);
    return;
  }
  await mkdir(dst, { recursive: true });
  // pnpm symlinks node_modules/pyodide into the store; dereference so we copy the real files.
  await cp(src, dst, { recursive: true, force: true, dereference: true });
  // Companion `.js` copy of the ES module entry. Some LMS file servers (notably
  // PeopleFluent / Schenker's instance) don't have a MIME mapping for `.mjs` and
  // serve it as `application/octet-stream`, which strict-MIME browsers reject for
  // `<script type="module">` and dynamic `import()`. Worker code imports the `.js`
  // copy so the browser sees `application/javascript` from any sane file server.
  if (await exists(join(dst, 'pyodide.mjs'))) {
    await copyFile(join(dst, 'pyodide.mjs'), join(dst, 'pyodide.module.js'));
    if (await exists(join(dst, 'pyodide.mjs.map'))) {
      await copyFile(join(dst, 'pyodide.mjs.map'), join(dst, 'pyodide.module.js.map'));
    }
  }
  console.log(`[copy-pyodide] copied ${src} → ${dst} (incl. .module.js companion)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
