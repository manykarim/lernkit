#!/usr/bin/env node
/**
 * Vendors Robot Framework libdoc JSONs from robotframework.org into
 * `apps/docs/public/rf-libdocs/`, so the editor's autocomplete loads them
 * from same-origin (ADR 0021) instead of cross-origin at runtime.
 *
 * Source: https://robotframework.org/robotframework/latest/libdoc/<Name>.json
 *
 * The robotframework.org canonical URL serves the libdocs for the *current*
 * stable version (in 2026 that's RF 7.4.2 — same as the wheel we vendor).
 * Per-version URLs (e.g. /v7.4.2/libdoc/BuiltIn.json) return 404. Instead
 * we record the embedded `version` field in each downloaded JSON into a
 * manifest.json so build-time drift is observable: if the upstream version
 * diverges from the vendored wheel version, the manifest shows it.
 *
 * Idempotent — runs as part of `prebuild` / `predev`. ~1.5 MB total payload
 * across the 7 standard libraries we ship.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const outDir = join(appRoot, 'public', 'rf-libdocs');

/**
 * The Robot Framework standard libraries shipped with the wheel. All are
 * pure-Python; all run in Pyodide-RF. SeleniumLibrary, Browser library, etc.
 * live in separate wheels and aren't shipped here — those are server-only
 * (rf-mcp) per ADR 0024.
 */
const LIBRARIES = [
  'BuiltIn',
  'Collections',
  'String',
  'DateTime',
  'OperatingSystem',
  'Process',
  'XML',
];

const RF_VERSION_PIN = '7.4.2'; // matches the vendored wheel; warn if upstream drifts

const BASE_URL = 'https://robotframework.org/robotframework/latest/libdoc';

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function fetchJsonBytes(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`fetch ${url} failed: ${res.status} ${res.statusText}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

async function downloadOne(name) {
  const url = `${BASE_URL}/${name}.json`;
  const dst = join(outDir, `${name}.json`);
  const bytes = await fetchJsonBytes(url);
  await writeFile(dst, bytes);
  const text = new TextDecoder('utf8').decode(bytes);
  const json = JSON.parse(text);
  return {
    library: name,
    file: `${name}.json`,
    sizeBytes: bytes.length,
    sha256: sha256(bytes),
    embeddedVersion: json.version ?? 'unknown',
    keywordCount: Array.isArray(json.keywords) ? json.keywords.length : 0,
    fetchedAt: new Date().toISOString(),
    url,
  };
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const manifestPath = join(outDir, 'manifest.json');
  const previous = (await exists(manifestPath))
    ? JSON.parse(await readFile(manifestPath, 'utf8'))
    : null;

  const results = [];
  for (const lib of LIBRARIES) {
    console.log(`[rf-libdocs] downloading ${BASE_URL}/${lib}.json`);
    const r = await downloadOne(lib);
    console.log(
      `[rf-libdocs]   ${r.file}: ${(r.sizeBytes / 1024).toFixed(1)} KB, ` +
        `RF ${r.embeddedVersion}, ${r.keywordCount} keywords`,
    );
    if (r.embeddedVersion !== RF_VERSION_PIN) {
      console.warn(
        `[rf-libdocs] WARNING: ${lib} embeds RF ${r.embeddedVersion} but we pin ${RF_VERSION_PIN}. ` +
          'Either bump RF_VERSION_PIN here + the wheel in download-rf-wheels.mjs, ' +
          'or accept the drift (libdocs are usually back-compatible across patch versions).',
      );
    }
    results.push(r);
  }

  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        rfVersionPin: RF_VERSION_PIN,
        libraries: results,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`[rf-libdocs] manifest written to ${manifestPath}`);

  // Friendly diff against the previous manifest so authors notice when
  // upstream content changes (keyword count drift, new RF version).
  if (previous?.libraries) {
    const before = new Map(previous.libraries.map((x) => [x.library, x]));
    for (const r of results) {
      const prev = before.get(r.library);
      if (!prev) continue;
      if (prev.embeddedVersion !== r.embeddedVersion) {
        console.log(
          `[rf-libdocs] note: ${r.library} version changed ${prev.embeddedVersion} → ${r.embeddedVersion}`,
        );
      }
      if (prev.keywordCount !== r.keywordCount) {
        console.log(
          `[rf-libdocs] note: ${r.library} keyword count changed ${prev.keywordCount} → ${r.keywordCount}`,
        );
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
