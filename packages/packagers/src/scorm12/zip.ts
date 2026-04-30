import { readFile } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';
import JSZip from 'jszip';

import { runtimeScriptTag } from './runtime.js';
import type { CoursePackage, PackagerOptions } from '../types.js';

/**
 * Zip layout rules for SCORM 1.2 (research §3.2):
 * - `imsmanifest.xml` MUST live at the zip root.
 * - No `__MACOSX/`, `.DS_Store`, `Thumbs.db` — single most common import-failure cause on macOS authors.
 * - No JSZip-synthesised directory entries — strict Java-based importers (older Saba, certain
 *   SuccessFactors builds) iterate ZipEntry and choke when these come through as files.
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
  readonly extraRootFiles?: ReadonlyArray<{ readonly path: string; readonly body: string | Uint8Array }>;
  readonly options?: PackagerOptions;
}

export async function buildScorm12Zip(input: ZipInput): Promise<{ buffer: Buffer; entries: string[] }> {
  const { pkg, manifestXml, runtimeFiles, extraRootFiles, options } = input;
  const zip = new JSZip();

  // 1. The manifest at the zip root — non-negotiable.
  zip.file('imsmanifest.xml', manifestXml);

  // 2. Additional zip-root files (e.g. metadata.xml — the externalised LOM the
  //    manifest's <adlcp:location> points at).
  for (const f of extraRootFiles ?? []) {
    if (isForbiddenEntry(f.path)) continue;
    zip.file(toPosix(f.path), f.body);
  }

  // 3. SCORM runtime + bundled XSDs under their conventional paths.
  for (const f of runtimeFiles) {
    if (isForbiddenEntry(f.path)) continue;
    zip.file(toPosix(f.path), f.body);
  }

  // 4. Lesson assets copied (and rewritten when they are SCO HTML) from the Astro build dir.
  //    The set of lesson hrefs tells us which HTML files are SCO entry points and need
  //    the runtime <script> injected — other HTML in the build (e.g. Pyodide consoles)
  //    is shipped as-is.
  const lessonHrefs = new Set(pkg.lessons.map((l) => toPosix(l.href)));

  // Pre-compute the full set of zip-root paths so the path-rewriter can resolve
  // root-absolute hrefs to in-bundle targets (or strip them when out-of-bundle).
  const packagePaths = new Set<string>();
  packagePaths.add('imsmanifest.xml');
  for (const f of extraRootFiles ?? []) {
    if (isForbiddenEntry(f.path)) continue;
    packagePaths.add(toPosix(f.path));
  }
  for (const f of runtimeFiles) {
    if (isForbiddenEntry(f.path)) continue;
    packagePaths.add(toPosix(f.path));
  }
  {
    const seenPre = new Set<string>();
    for (const lesson of pkg.lessons) {
      const files = [lesson.href, ...lesson.assets];
      for (const rel of files) {
        const normalised = toPosix(rel);
        if (seenPre.has(normalised)) continue;
        if (isForbiddenEntry(normalised)) continue;
        if (options?.filter && !options.filter(normalised)) continue;
        packagePaths.add(normalised);
        seenPre.add(normalised);
      }
    }
  }

  // Pre-pass over lesson HTML to collect the union of stylesheets referenced anywhere
  // in the course. Astro emits some stylesheets (e.g. Expressive Code's) only on pages
  // that need them, but ClientRouter's persist matching requires the SAME persist id
  // to exist in BOTH old and new docs to skip the wrong-URL preload during cross-page
  // navigation. Including every stylesheet on every lesson with the right depth-prefix
  // closes that gap; the extra fetches happen once on first load and are cached.
  const allStylesheets = new Set<string>();
  for (const lesson of pkg.lessons) {
    const normalised = toPosix(lesson.href);
    if (isForbiddenEntry(normalised)) continue;
    if (options?.filter && !options.filter(normalised)) continue;
    const abs = join(pkg.distDir, lesson.href);
    const html = await readFile(abs, 'utf8');
    for (const m of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
      const href = m[1] ?? '';
      const pkgPath = href.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
      if (pkgPath.startsWith('_astro/')) allStylesheets.add(pkgPath);
    }
  }

  // Pre-load Expressive Code stylesheet contents so they can be inlined per lesson.
  // The persist+harmonise mechanism prevents wrong-URL preloads in spec-compliant
  // ClientRouter environments (verified in SCORM Cloud), but some enterprise LMSes
  // (PeopleFluent / DB Schenker observed) bypass the persist match for this specific
  // chunk and re-resolve the stylesheet href against a stale document URL during
  // cross-depth navigation, hitting a 404. Inlining the CSS as `<style>` removes
  // the URL-resolution surface entirely. Only `ec.*.css` (Expressive Code's per-grammar
  // chunk, ~18 KB) is inlined — the main `index.*.css` (~62 KB) stays as `<link>`
  // because it loads cleanly across all observed LMSes and inlining it would
  // duplicate ~1 MB across 17 lesson HTMLs.
  const inlinedStylesheetContents = new Map<string, string>();
  for (const path of allStylesheets) {
    const basename = path.split('/').pop() ?? '';
    if (!/^ec\..*\.css$/.test(basename)) continue;
    const abs = join(pkg.distDir, path);
    try {
      const content = await readFile(abs, 'utf8');
      inlinedStylesheetContents.set(basename, content);
    } catch {
      // Best-effort: if the file isn't where we expected, fall back to leaving
      // the <link> in place (the persist mechanism still applies).
    }
  }

  const seen = new Set<string>();
  for (const lesson of pkg.lessons) {
    const files = [lesson.href, ...lesson.assets];
    for (const rel of files) {
      const normalised = toPosix(rel);
      if (seen.has(normalised)) continue;
      if (isForbiddenEntry(normalised)) continue;
      if (options?.filter && !options.filter(normalised)) continue;

      const abs = join(pkg.distDir, rel);
      const raw = await readFile(abs);
      let body: string | Buffer;
      if (lessonHrefs.has(normalised)) {
        const depth = depthOf(normalised);
        const docDir = normalised.includes('/') ? normalised.slice(0, normalised.lastIndexOf('/')) : '';
        const injected = injectRuntimeScript(raw.toString('utf8'), depth);
        const rewritten = rewriteAbsolutePaths(injected, depth, packagePaths, docDir);
        const harmonised = harmoniseStylesheets(rewritten, depth, allStylesheets);
        const persisted = addAstroTransitionPersist(harmonised);
        body = inlineStylesheets(persisted, inlinedStylesheetContents);
      } else if (/^_astro\/.*\.js$/.test(normalised)) {
        body = rewriteAstroJsPaths(raw.toString('utf8'));
      } else {
        body = raw;
      }
      zip.file(normalised, body);
      seen.add(normalised);
    }
  }

  // Strip JSZip-auto-synthesised directory entries (`foo/`, `foo/bar/`) before serialising.
  // They are unnecessary — paths embed their own directory structure — and several Java
  // LMS importers fail when they hit a "file" with `dir=true`.
  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (entry?.dir) {
      delete zip.files[name];
    }
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    // platform=UNIX keeps perms clean; UNIX is the convention SCORM LMSes tolerate best.
    platform: 'UNIX',
  });

  const entries: string[] = [];
  zip.forEach((path, entry) => {
    if (!entry.dir) entries.push(path);
  });

  return { buffer, entries: entries.sort() };
}

/**
 * Inject the SCORM 1.2 runtime <script> + a tiny init bootstrap into a SCO's HTML.
 * Idempotent: returns the input unchanged when `lernkit-runtime/scorm12.js` is
 * already referenced. Inserted just before `</head>` so the API discovery + init
 * runs before any in-page bundle executes.
 */
export function injectRuntimeScript(html: string, depth: number): string {
  if (/lernkit-runtime\/scorm12\.js/.test(html)) return html;

  const tag = runtimeScriptTag(depth);
  // `defer` would be wrong here — LMSInitialize must fire synchronously during head
  // parsing so the API call lands before any other script touches `cmi.*`.
  const bootstrap =
    '<script>(function(){try{var rt=window.LernkitScorm12;if(rt&&rt.init)rt.init();}catch(e){}})();</script>';
  const inject = tag + bootstrap;

  if (/<\/head\s*>/i.test(html)) {
    return html.replace(/<\/head\s*>/i, inject + '</head>');
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => m + inject);
  }
  // No <head> at all: prepend at the very top so the runtime still loads.
  return inject + html;
}

/** Compute the parent-relative depth of a zip-root-relative path. `a/b/c.html` → 2. */
export function depthOf(relPath: string): number {
  const segments = relPath.split('/').filter((s) => s.length > 0);
  return Math.max(0, segments.length - 1);
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

/**
 * Rewrite root-absolute href/src attributes (`/_astro/x.css`, `/rf-training/foo`) to
 * depth-prefixed relative paths so the SCO runs from any LMS-served subdirectory,
 * AND append `index.html` to already-relative directory-style links (Starlight's
 * prev/next sibling nav emits `href="../sibling/"` which a static LMS file server
 * does not auto-route to `index.html`).
 *
 * Also covers Astro's `<astro-island>` URL attributes (`component-url`,
 * `renderer-url`, `before-hydration-url`) — Astro's island runtime invokes
 * `import()` on these verbatim, so a root-absolute `/_astro/X.js` resolves to
 * `<host>/_astro/X.js` (host root) and 404s in any LMS that serves the SCO from
 * a subdirectory. For `client="visible"` islands (Lernkit's only directive) the
 * `import()` fires inside an IntersectionObserver callback that runs after
 * `moveToLocation`/pushState, so a depth-prefixed relative path resolves
 * correctly even across cross-depth ClientRouter navigations.
 *
 * Out-of-bundle targets are stripped (the entire attribute is removed) — leaving
 * `<a href="/external/page">` would still 404 at runtime.
 *
 * `docDir` is the document's parent directory inside the package (e.g.
 * `rf-training/section-1-getting-started/1-1-install-python`). When provided, the
 * rewriter resolves relative directory-style links against it and only appends
 * `index.html` when the resolved target actually exists in `packagePaths`.
 */
export function rewriteAbsolutePaths(
  html: string,
  depth: number,
  packagePaths: ReadonlySet<string>,
  docDir?: string,
): string {
  const prefix = depth <= 0 ? '' : '../'.repeat(depth);
  let out = html.replace(
    /(\s)(href|src|component-url|renderer-url|before-hydration-url)="([^"]*)"/g,
    (match, ws: string, attr: string, value: string) => {
      if (value.length === 0) return match;
      if (!value.startsWith('/')) return match;
      if (value.startsWith('//')) return match;
      if (value === '/') return '';
      const path = value.slice(1);
      let target: string | undefined;
      if (packagePaths.has(path)) {
        target = path;
      } else if (path.endsWith('/') && packagePaths.has(path + 'index.html')) {
        target = path + 'index.html';
      } else if (packagePaths.has(path + '/index.html')) {
        target = path + '/index.html';
      }
      if (target === undefined) return '';
      return `${ws}${attr}="${prefix}${target}"`;
    },
  );

  if (docDir !== undefined) {
    out = out.replace(/(\s)(href|src)="(\.{1,2}\/[^"]*\/)"/g, (match, ws: string, attr: string, value: string) => {
      const resolved = resolveRelative(docDir, value);
      const candidate = resolved + 'index.html';
      if (!packagePaths.has(candidate)) return match;
      return `${ws}${attr}="${value}index.html"`;
    });
  }

  return out;
}

/** Resolve a `./` or `../`-prefixed value against a base posix directory. Returns a posix path. */
function resolveRelative(baseDir: string, value: string): string {
  const baseParts = baseDir.split('/').filter((p) => p.length > 0);
  const valueParts = value.split('/');
  for (const part of valueParts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      baseParts.pop();
      continue;
    }
    baseParts.push(part);
  }
  const trail = value.endsWith('/') ? '/' : '';
  return baseParts.join('/') + trail;
}

/**
 * Rewrite `"/_astro/<rest>"` and `'/_astro/<rest>'` string literals inside Astro-emitted
 * JS chunks to `"./<rest>"` so worker URLs and dynamic imports resolve under the SCO's
 * subdirectory regardless of where the LMS serves it.
 */
export function rewriteAstroJsPaths(jsSource: string): string {
  return jsSource
    .replace(/"\/_astro\/([^"]*)"/g, '"./$1"')
    .replace(/'\/_astro\/([^']*)'/g, "'./$1'");
}

/**
 * Ensure every lesson HTML references the full union of stylesheets used anywhere
 * in the course, with the right depth-prefix per page. Pairs with `addAstroTransitionPersist`:
 * once every page references every stylesheet, the persist match succeeds on every
 * cross-page navigation and ClientRouter never preloads the wrong URL.
 *
 * Missing stylesheets are appended just before `</head>` with `data-astro-transition-persist`
 * already set, so the persist pass is a no-op for them.
 */
export function harmoniseStylesheets(
  html: string,
  depth: number,
  allStylesheets: ReadonlySet<string>,
): string {
  if (allStylesheets.size === 0) return html;
  const prefix = depth <= 0 ? '' : '../'.repeat(depth);

  const present = new Set<string>();
  for (const m of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
    const href = m[1] ?? '';
    const basename = href.split('/').pop();
    if (basename) present.add(basename);
  }

  let inject = '';
  for (const path of allStylesheets) {
    const basename = path.split('/').pop();
    if (!basename) continue;
    if (present.has(basename)) continue;
    inject += `<link rel="stylesheet" href="${prefix}${path}" data-astro-transition-persist="stylesheet:${basename}">`;
  }

  if (!inject) return html;
  if (/<\/head\s*>/i.test(html)) return html.replace(/<\/head\s*>/i, inject + '</head>');
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + inject);
  return inject + html;
}

/**
 * Replace `<link rel="stylesheet" href="…<basename>" …>` with an inline
 * `<style>` carrying the stylesheet's content. Targets stylesheets that some
 * LMSes mishandle when fetched as separate requests (typically Expressive
 * Code's per-grammar chunk on PeopleFluent / Cornerstone where the cross-depth
 * ClientRouter preload race produces a 404 and the file is served as text/plain).
 *
 * The `<style>` element carries `data-astro-transition-persist="style:<basename>"`
 * so ClientRouter's swap algorithm preserves it across SPA navigation rather
 * than removing+re-inserting (cheaper, no flash). The persist id collides only
 * with itself, never with the original `<link>` element.
 *
 * Stylesheets whose `basename` is not in `inlined` are left untouched.
 */
export function inlineStylesheets(html: string, inlined: ReadonlyMap<string, string>): string {
  if (inlined.size === 0) return html;
  return html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (match, href: string) => {
    const basename = href.split('/').pop();
    if (!basename) return match;
    const css = inlined.get(basename);
    if (css === undefined) return match;
    // Astro's persist id namespace uses `kind:basename`; we use `style:` to keep
    // it distinct from `stylesheet:` (the persist id we set on `<link>` tags).
    return `<style data-astro-transition-persist="style:${basename}">${css}</style>`;
  });
}

/**
 * Add `data-astro-transition-persist` to head elements that are textually different
 * across pages (different `../` depth-prefix) but reference the same underlying asset
 * (same content-hashed basename). Astro's <ClientRouter /> sequences `doSwap` BEFORE
 * `moveToLocation` (router.js:196-197), so during a cross-depth navigation the new
 * page's `<link rel="stylesheet" href="../../_astro/x.css">` is preloaded against the
 * OLD document URL (one level too high) — manifesting as 401 in SCORM Cloud and as
 * 404+text/plain in PeopleFluent. With persist attrs, ClientRouter's preload check
 * matches the existing element by id and skips the wrong-URL preload, and the swap
 * algorithm preserves the already-loaded element in place rather than removing it.
 *
 * Persist scope:
 * - `<link rel="stylesheet" href="X">`
 * - `<link rel="modulepreload" href="X">`
 * - `<link rel="preload" href="X">`
 * - `<script type="module" src="X">`
 * - `<script src=".../lernkit-runtime/scorm12.js">` (the runtime is stateful — the
 *   module-local `initialized` flag must NOT be reset on each SPA navigation)
 *
 * The persist id is `<kind>:<basename(url)>` so two different elements pointing at the
 * same basename (e.g., a stylesheet and a preload of the same file) get distinct ids
 * and Astro's per-id swap matching stays sound.
 */
export function addAstroTransitionPersist(html: string): string {
  return html.replace(/<(link|script)\b[^>]*>/g, (tag) => {
    if (/\sdata-astro-transition-persist=/.test(tag)) return tag;

    let url: string | undefined;
    let kind: string | undefined;

    if (tag.startsWith('<link')) {
      const relMatch = tag.match(/\srel="([^"]+)"/);
      if (!relMatch) return tag;
      const rel = relMatch[1] ?? '';
      if (rel !== 'stylesheet' && rel !== 'modulepreload' && rel !== 'preload') return tag;
      const hrefMatch = tag.match(/\shref="([^"]+)"/);
      if (!hrefMatch) return tag;
      url = hrefMatch[1];
      kind = rel;
    } else {
      const srcMatch = tag.match(/\ssrc="([^"]+)"/);
      if (!srcMatch) return tag;
      url = srcMatch[1];
      const typeMatch = tag.match(/\stype="([^"]+)"/);
      const isModule = typeMatch?.[1] === 'module';
      const isLernkitRuntime = url !== undefined && /lernkit-runtime\/scorm12\.js$/.test(url);
      if (!isModule && !isLernkitRuntime) return tag;
      kind = isModule ? 'module' : 'script';
    }

    if (url === undefined || kind === undefined) return tag;
    const basename = url.split('/').pop();
    if (!basename) return tag;
    const persistId = `${kind}:${basename}`;

    return tag.replace(/^<(link|script)/, `<$1 data-astro-transition-persist="${persistId}"`);
  });
}
