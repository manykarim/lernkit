import type { Completion } from '@codemirror/autocomplete';
import { builtinKeywordCompletions } from './builtin-keywords.js';

/**
 * Runtime loader for the vendored Robot Framework libdoc JSONs.
 *
 * Build-time pipeline:
 *   apps/docs/scripts/download-rf-libdocs.mjs vendors the JSONs from
 *   robotframework.org into apps/docs/public/rf-libdocs/, accompanied
 *   by a manifest.json listing the libraries we ship.
 *
 * Runtime: this module fetches the manifest, then each library JSON,
 * and converts the keyword definitions into CodeMirror Completion
 * entries. Module-level promise cache so the network round-trip
 * happens at most once per page mount.
 *
 * Fallback: if the fetch fails (offline preview, missing build step),
 * we surface the small hardcoded `builtinKeywordCompletions` so the
 * editor still gets a basic experience instead of going dark.
 */

interface LibdocArg {
  readonly name: string;
  readonly defaultValue: string | null;
  readonly required: boolean;
  readonly kind: string;
  readonly repr?: string;
  readonly type?: { readonly name?: string };
}

interface LibdocKeyword {
  readonly name: string;
  readonly args: readonly LibdocArg[];
  readonly doc?: string;
  readonly shortdoc?: string;
  readonly tags?: readonly string[];
  readonly returnType?: { readonly name?: string } | null;
}

interface LibdocFile {
  readonly name: string;
  readonly version?: string;
  readonly doc?: string;
  readonly keywords: readonly LibdocKeyword[];
}

interface LibdocManifestLibrary {
  readonly library: string;
  readonly file: string;
  readonly embeddedVersion?: string;
}

interface LibdocManifest {
  readonly generatedAt: string;
  readonly rfVersionPin?: string;
  readonly libraries: readonly LibdocManifestLibrary[];
}

// Resolved at module-evaluation time so the libdocs are reachable from any
// host path. The bundled module lives under `_astro/`, so `../rf-libdocs/`
// from `import.meta.url` lands on the package's vendored libdoc directory.
// A root-absolute path (`/rf-libdocs`) would resolve to the host root and
// 404 inside an LMS sub-path mount (SCORM Cloud, PeopleFluent, etc.).
const LIBDOCS_BASE = new URL('../rf-libdocs/', import.meta.url).href;

let cache: Promise<readonly Completion[]> | null = null;

export function loadLibdocCompletions(): Promise<readonly Completion[]> {
  if (cache) return cache;
  cache = (async () => {
    try {
      // Use the fetch default (`credentials: 'same-origin'`) so LMSes that gate
      // package files behind a session cookie still authorise the request.
      const manifestRes = await fetch(new URL('manifest.json', LIBDOCS_BASE).href);
      if (!manifestRes.ok) throw new Error(`manifest fetch failed: ${manifestRes.status}`);
      const manifest = (await manifestRes.json()) as LibdocManifest;

      const completions: Completion[] = [];
      const seen = new Set<string>();

      for (const entry of manifest.libraries) {
        try {
          const libRes = await fetch(new URL(entry.file, LIBDOCS_BASE).href);
          if (!libRes.ok) continue;
          const libdoc = (await libRes.json()) as LibdocFile;
          for (const kw of libdoc.keywords ?? []) {
            // Dedupe by exact name. BuiltIn wins ties because it's listed first
            // in the manifest; later libraries (Collections, OperatingSystem)
            // rarely shadow BuiltIn but if they do, the first registration sticks.
            const key = `${libdoc.name}:${kw.name}`;
            if (seen.has(key)) continue;
            seen.add(key);
            completions.push(toCompletion(libdoc.name, kw));
          }
        } catch {
          // Skip an individual library on error; keep loading the rest.
        }
      }

      // Sort alphabetically — CM6 autocomplete fuzzy-matches against the prefix,
      // so order doesn't affect ranking, but a stable order helps when several
      // entries share a relevance score.
      completions.sort((a, b) => a.label.localeCompare(b.label));
      return completions;
    } catch {
      // Network / CORS / build-time miss — fall back to the hardcoded list.
      return builtinKeywordCompletions;
    }
  })();
  return cache;
}

function toCompletion(libraryName: string, kw: LibdocKeyword): Completion {
  const signature = formatSignature(kw.args);
  const detail = signature ? `${libraryName} · ${signature}` : libraryName;
  return {
    label: kw.name,
    type: 'function',
    detail,
    info: () => buildInfoElement(libraryName, kw),
    boost: detailBoost(libraryName),
  };
}

/**
 * Slight ranking nudge: BuiltIn keywords surface above identically-named
 * library keywords (they almost never collide, but when they do the
 * BuiltIn one is what learners want first).
 */
function detailBoost(libraryName: string): number {
  if (libraryName === 'BuiltIn') return 1;
  if (libraryName === 'Collections' || libraryName === 'String') return 0;
  return -1;
}

function formatSignature(args: readonly LibdocArg[]): string {
  if (!args || args.length === 0) return '';
  const parts: string[] = [];
  for (const a of args) {
    if (a.repr) {
      parts.push(a.repr);
      continue;
    }
    let label = a.name;
    if (a.defaultValue != null) label += `=${a.defaultValue}`;
    parts.push(label);
  }
  // Truncate long signatures so they fit in the autocomplete row.
  const joined = parts.join(', ');
  return joined.length > 80 ? `${joined.slice(0, 77)}…` : joined;
}

function buildInfoElement(libraryName: string, kw: LibdocKeyword): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'lernkit-rf-completion-doc';

  const head = document.createElement('div');
  head.className = 'lernkit-rf-completion-doc__head';
  head.textContent = `${libraryName} · ${kw.name}`;
  wrap.appendChild(head);

  if (kw.args && kw.args.length > 0) {
    const sig = document.createElement('pre');
    sig.className = 'lernkit-rf-completion-doc__sig';
    sig.textContent = formatSignature(kw.args);
    wrap.appendChild(sig);
  }

  const summary = document.createElement('p');
  summary.className = 'lernkit-rf-completion-doc__summary';
  summary.textContent = kw.shortdoc ?? '';
  wrap.appendChild(summary);

  if (kw.tags && kw.tags.length > 0) {
    const tags = document.createElement('div');
    tags.className = 'lernkit-rf-completion-doc__tags';
    for (const t of kw.tags) {
      const chip = document.createElement('span');
      chip.className = 'lernkit-rf-completion-doc__tag';
      chip.textContent = t;
      tags.appendChild(chip);
    }
    wrap.appendChild(tags);
  }

  if (kw.returnType?.name) {
    const ret = document.createElement('div');
    ret.className = 'lernkit-rf-completion-doc__return';
    ret.textContent = `returns: ${kw.returnType.name}`;
    wrap.appendChild(ret);
  }

  return wrap;
}

/** Test-only — clears the module-level cache so repeated fetches go through. */
export function __resetLibdocCacheForTests(): void {
  cache = null;
}
