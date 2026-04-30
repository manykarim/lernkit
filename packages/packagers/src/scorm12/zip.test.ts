import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CoursePackage } from '../types.js';
import {
  addAstroTransitionPersist,
  buildScorm12Zip,
  depthOf,
  harmoniseStylesheets,
  injectRuntimeScript,
  inlineStylesheets,
  isForbiddenEntry,
  rewriteAbsolutePaths,
  rewriteAstroJsPaths,
  toPosix,
  zipFilenameFor,
} from './zip.js';

function fixture(distDir: string): CoursePackage {
  return {
    metadata: {
      courseId: 'test-course',
      title: 'Test',
      version: '0.1.0',
      language: 'en',
    },
    lessons: [
      {
        id: 'lesson-1',
        title: 'Lesson 1',
        href: 'lesson-1/index.html',
        assets: ['_astro/shared.css'],
      },
    ],
    distDir,
  };
}

describe('isForbiddenEntry', () => {
  it.each(['__MACOSX/somefile', 'foo/__MACOSX/bar', '.DS_Store', 'sub/dir/.DS_Store', 'Thumbs.db', 'sub/.directory'])(
    'rejects %s',
    (path) => {
      expect(isForbiddenEntry(path)).toBe(true);
    },
  );

  it.each(['imsmanifest.xml', 'lesson-1/index.html', '_astro/hello.css', 'lernkit-runtime/scorm12.js'])(
    'allows %s',
    (path) => {
      expect(isForbiddenEntry(path)).toBe(false);
    },
  );
});

describe('toPosix', () => {
  it('preserves forward-slash paths', () => {
    expect(toPosix('foo/bar/baz.txt')).toBe('foo/bar/baz.txt');
  });
  // We don't assert Windows backslash→slash here because tests run on the host's `sep`; on POSIX hosts
  // the backslash branch is unreachable. The behaviour is covered structurally by the zip integration test.
});

describe('zipFilenameFor', () => {
  it('sanitises course id and version', () => {
    expect(zipFilenameFor('My Course 01!', '1.0.0-beta', 'scorm12')).toBe('My-Course-01-1.0.0-beta-scorm12.zip');
  });
});

describe('buildScorm12Zip', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = join(tmpdir(), `lernkit-zip-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(tmp, '_astro'), { recursive: true });
    await mkdir(join(tmp, 'lesson-1'), { recursive: true });
    await writeFile(join(tmp, '_astro', 'shared.css'), 'body{}');
    await writeFile(join(tmp, 'lesson-1', 'index.html'), '<!doctype html><title>L1</title>');
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('puts imsmanifest.xml at the zip root', async () => {
    const { buffer, entries } = await buildScorm12Zip({
      pkg: fixture(tmp),
      manifestXml: '<?xml version="1.0"?><manifest/>',
      runtimeFiles: [],
    });
    expect(entries).toContain('imsmanifest.xml');
    // Re-parse to confirm JSZip sees the manifest at zip-root (no "foo/imsmanifest.xml" nesting).
    const round = await JSZip.loadAsync(buffer);
    const rootEntry = round.file('imsmanifest.xml');
    expect(rootEntry).not.toBeNull();
    const xml = await rootEntry?.async('string');
    expect(xml).toContain('<manifest/>');
  });

  it('rejects forbidden entries even if present in runtimeFiles', async () => {
    const encoder = new TextEncoder();
    const { entries } = await buildScorm12Zip({
      pkg: fixture(tmp),
      manifestXml: '<manifest/>',
      runtimeFiles: [
        { path: '__MACOSX/trash', body: encoder.encode('x') },
        { path: 'lernkit-runtime/scorm12.js', body: encoder.encode('ok') },
      ],
    });
    expect(entries).not.toContain('__MACOSX/trash');
    expect(entries).toContain('lernkit-runtime/scorm12.js');
  });

  it('includes every lesson asset exactly once even if referenced by multiple lessons', async () => {
    // Duplicate 'shared.css' across two lessons to check dedupe.
    const pkg: CoursePackage = {
      ...fixture(tmp),
      lessons: [
        ...fixture(tmp).lessons,
        {
          id: 'lesson-2',
          title: 'Lesson 2',
          href: 'lesson-1/index.html', // intentionally shared
          assets: ['_astro/shared.css'],
        },
      ],
    };
    const { entries } = await buildScorm12Zip({
      pkg,
      manifestXml: '<manifest/>',
      runtimeFiles: [],
    });
    const sharedCount = entries.filter((e) => e === '_astro/shared.css').length;
    const indexCount = entries.filter((e) => e === 'lesson-1/index.html').length;
    expect(sharedCount).toBe(1);
    expect(indexCount).toBe(1);
  });

  it('respects a caller-supplied filter', async () => {
    const { entries } = await buildScorm12Zip({
      pkg: fixture(tmp),
      manifestXml: '<manifest/>',
      runtimeFiles: [],
      options: { filter: (p) => !p.endsWith('.css') },
    });
    expect(entries).not.toContain('_astro/shared.css');
    expect(entries).toContain('lesson-1/index.html');
  });

  it('produces a zip that starts with the PK magic', async () => {
    const { buffer } = await buildScorm12Zip({
      pkg: fixture(tmp),
      manifestXml: '<manifest/>',
      runtimeFiles: [],
    });
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it('emits zero JSZip-synthesised directory entries (foo/, _astro/, etc.)', async () => {
    const { buffer } = await buildScorm12Zip({
      pkg: fixture(tmp),
      manifestXml: '<manifest/>',
      runtimeFiles: [],
    });
    const round = await JSZip.loadAsync(buffer);
    const dirNames: string[] = [];
    round.forEach((path, entry) => {
      if (entry.dir) dirNames.push(path);
    });
    expect(dirNames).toEqual([]);
  });

  it('injects the runtime <script> into each lesson HTML, with the right relative depth', async () => {
    const pkg: CoursePackage = {
      ...fixture(tmp),
      lessons: [
        {
          id: 'shallow',
          title: 'Shallow',
          href: 'lesson-1/index.html',
          assets: [],
        },
      ],
    };
    const { buffer } = await buildScorm12Zip({
      pkg,
      manifestXml: '<manifest/>',
      runtimeFiles: [],
    });
    const round = await JSZip.loadAsync(buffer);
    const html = await round.file('lesson-1/index.html')?.async('string');
    expect(html).toBeDefined();
    expect(html).toContain('src="../lernkit-runtime/scorm12.js"');
    expect(html).toContain('LernkitScorm12');
  });

  it('does not inject into HTML that already references the runtime (idempotent)', async () => {
    await writeFile(
      join(tmp, 'lesson-1', 'index.html'),
      '<!doctype html><head><script src="../lernkit-runtime/scorm12.js"></script></head>',
    );
    const { buffer } = await buildScorm12Zip({
      pkg: fixture(tmp),
      manifestXml: '<manifest/>',
      runtimeFiles: [],
    });
    const round = await JSZip.loadAsync(buffer);
    const html = (await round.file('lesson-1/index.html')?.async('string')) ?? '';
    const occurrences = (html.match(/lernkit-runtime\/scorm12\.js/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it('rewrites HTML and _astro JS to use depth-prefixed relative paths', async () => {
    await writeFile(
      join(tmp, 'lesson-1', 'index.html'),
      '<!doctype html><html><head><link href="/_astro/shared.css" rel="stylesheet"><script src="/_astro/runtime.js"></script></head><body></body></html>',
    );
    await writeFile(
      join(tmp, '_astro', 'runtime.js'),
      'new Worker(new URL("/_astro/foo.worker.js", import.meta.url));',
    );
    await writeFile(join(tmp, '_astro', 'foo.worker.js'), 'self.onmessage=function(){};');

    const pkg: CoursePackage = {
      ...fixture(tmp),
      lessons: [
        {
          id: 'lesson-1',
          title: 'L1',
          href: 'lesson-1/index.html',
          assets: ['_astro/shared.css', '_astro/runtime.js', '_astro/foo.worker.js'],
        },
      ],
    };
    const { buffer } = await buildScorm12Zip({ pkg, manifestXml: '<manifest/>', runtimeFiles: [] });
    const round = await JSZip.loadAsync(buffer);
    const html = (await round.file('lesson-1/index.html')?.async('string')) ?? '';
    expect(html).toContain('href="../_astro/shared.css"');
    expect(html).toContain('src="../_astro/runtime.js"');
    const js = (await round.file('_astro/runtime.js')?.async('string')) ?? '';
    expect(js).toBe('new Worker(new URL("./foo.worker.js", import.meta.url));');
  });

  it('does not inject into non-lesson HTML even when present in the package', async () => {
    // pyodide-style ancillary HTML — should ship verbatim.
    await mkdir(join(tmp, 'pyodide'), { recursive: true });
    await writeFile(join(tmp, 'pyodide', 'console.html'), '<!doctype html><head></head>');
    const pkg: CoursePackage = {
      ...fixture(tmp),
      lessons: [
        {
          id: 'lesson-1',
          title: 'L1',
          href: 'lesson-1/index.html',
          assets: ['pyodide/console.html'],
        },
      ],
    };
    const { buffer } = await buildScorm12Zip({
      pkg,
      manifestXml: '<manifest/>',
      runtimeFiles: [],
    });
    const round = await JSZip.loadAsync(buffer);
    const consoleHtml = (await round.file('pyodide/console.html')?.async('string')) ?? '';
    expect(consoleHtml).not.toContain('lernkit-runtime');
  });
});

describe('depthOf', () => {
  it.each([
    ['index.html', 0],
    ['rf-training/index.html', 1],
    ['rf-training/cheat-sheet/index.html', 2],
    ['a/b/c/d/index.html', 4],
  ])('depthOf(%j) === %i', (path, expected) => {
    expect(depthOf(path)).toBe(expected);
  });
});

describe('injectRuntimeScript', () => {
  it('inserts the runtime tag immediately before </head>', () => {
    const html = '<!doctype html><html><head><title>X</title></head><body>hi</body></html>';
    const out = injectRuntimeScript(html, 1);
    expect(out).toMatch(/<script src="\.\.\/lernkit-runtime\/scorm12\.js"><\/script>/);
    expect(out).toMatch(/LernkitScorm12.*<\/head>/);
  });

  it('inserts after <head ...> when no </head> is present', () => {
    const html = '<head data-foo>broken html';
    const out = injectRuntimeScript(html, 0);
    expect(out).toMatch(/<head data-foo><script src="lernkit-runtime\/scorm12\.js">/);
  });

  it('prepends the runtime tag when there is no <head> at all', () => {
    const html = '<body>just body</body>';
    const out = injectRuntimeScript(html, 0);
    expect(out.startsWith('<script src="lernkit-runtime/scorm12.js">')).toBe(true);
  });

  it('returns the input unchanged when the runtime is already referenced', () => {
    const html = '<head><script src="lernkit-runtime/scorm12.js"></script></head>';
    expect(injectRuntimeScript(html, 0)).toBe(html);
  });

  it('uses the right relative prefix for nested SCO HTML', () => {
    const out = injectRuntimeScript('<head></head>', 3);
    expect(out).toContain('src="../../../lernkit-runtime/scorm12.js"');
  });
});

describe('rewriteAbsolutePaths', () => {
  const pkg = new Set(['_astro/index.css', 'rf-training/cheat-sheet/index.html', 'rf-training/index.html']);

  it('rewrites href to a known package file with the right depth', () => {
    const out = rewriteAbsolutePaths('<link href="/_astro/index.css">', 2, pkg);
    expect(out).toBe('<link href="../../_astro/index.css">');
  });
  it('rewrites src to a known package file', () => {
    const out = rewriteAbsolutePaths('<script src="/_astro/index.css">', 1, pkg);
    expect(out).toBe('<script src="../_astro/index.css">');
  });
  it('rewrites a directory-style internal nav link to its index.html', () => {
    const out = rewriteAbsolutePaths('<a href="/rf-training/cheat-sheet">x</a>', 1, pkg);
    expect(out).toBe('<a href="../rf-training/cheat-sheet/index.html">x</a>');
  });
  it('rewrites a trailing-slash directory-style link', () => {
    const out = rewriteAbsolutePaths('<a href="/rf-training/cheat-sheet/">x</a>', 0, pkg);
    expect(out).toBe('<a href="rf-training/cheat-sheet/index.html">x</a>');
  });
  it('strips out-of-bundle href on <a>', () => {
    const out = rewriteAbsolutePaths('<a href="/guides/quickstart">G</a>', 1, pkg);
    expect(out).toBe('<a>G</a>');
  });
  it('strips href on out-of-bundle <link>', () => {
    const out = rewriteAbsolutePaths('<link rel="icon" href="/favicon.svg">', 0, pkg);
    expect(out).toBe('<link rel="icon">');
  });
  it('strips href="/" entirely', () => {
    const out = rewriteAbsolutePaths('<a href="/">home</a>', 2, pkg);
    expect(out).toBe('<a>home</a>');
  });
  it('leaves protocol-absolute, data:, anchor, mailto:, and protocol-relative URLs alone', () => {
    for (const url of ['https://x.com/y', 'data:image/svg+xml,abc', '#section', 'mailto:a@b', '//cdn.example.com/x']) {
      const out = rewriteAbsolutePaths(`<a href="${url}">x</a>`, 1, pkg);
      expect(out).toBe(`<a href="${url}">x</a>`);
    }
  });
  it('is idempotent — running twice yields the same output', () => {
    const once = rewriteAbsolutePaths('<link href="/_astro/index.css">', 2, pkg);
    const twice = rewriteAbsolutePaths(once, 2, pkg);
    expect(twice).toBe(once);
  });
  it('does not rewrite the injected runtime tag (which uses ../-prefixed src already)', () => {
    const inj = '<script src="../../lernkit-runtime/scorm12.js"></script>';
    expect(rewriteAbsolutePaths(inj, 2, pkg)).toBe(inj);
  });

  describe('relative-directory link suffixing (Starlight prev/next nav)', () => {
    const docDir = 'rf-training/section-1-getting-started/1-1-install-python';
    const pkgWithSiblings = new Set([
      ...pkg,
      'rf-training/section-1-getting-started/1-2-virtual-environments/index.html',
      'rf-training/section-1-getting-started/index.html',
    ]);

    it('appends index.html to a sibling directory link (../1-2-virtual-environments/)', () => {
      const out = rewriteAbsolutePaths(
        '<a href="../1-2-virtual-environments/">next</a>',
        3,
        pkgWithSiblings,
        docDir,
      );
      expect(out).toBe('<a href="../1-2-virtual-environments/index.html">next</a>');
    });

    it('appends index.html to ./X/ relative directory links', () => {
      const out = rewriteAbsolutePaths(
        '<a href="./review/">review</a>',
        2,
        new Set(['rf-training/section-1-getting-started/review/index.html']),
        'rf-training/section-1-getting-started',
      );
      expect(out).toBe('<a href="./review/index.html">review</a>');
    });

    it('leaves a directory link alone when no index.html exists for it (defensive)', () => {
      const out = rewriteAbsolutePaths(
        '<a href="../no-such-page/">nope</a>',
        3,
        pkgWithSiblings,
        docDir,
      );
      expect(out).toBe('<a href="../no-such-page/">nope</a>');
    });

    it('skips relative directory rewrite when docDir is omitted', () => {
      const out = rewriteAbsolutePaths('<a href="../sibling/">x</a>', 1, pkg);
      expect(out).toBe('<a href="../sibling/">x</a>');
    });

    it('is idempotent across the relative-suffix pass', () => {
      const once = rewriteAbsolutePaths(
        '<a href="../1-2-virtual-environments/">x</a>',
        3,
        pkgWithSiblings,
        docDir,
      );
      const twice = rewriteAbsolutePaths(once, 3, pkgWithSiblings, docDir);
      expect(twice).toBe(once);
    });
  });

  describe('astro-island URL attributes', () => {
    const islandPkg = new Set([
      '_astro/RunnableRobot.X.js',
      '_astro/Section1ReviewQuiz.Y.js',
      '_astro/client.Z.js',
      '_astro/before.W.js',
    ]);

    it('rewrites component-url with the right depth prefix', () => {
      const out = rewriteAbsolutePaths(
        '<astro-island component-url="/_astro/RunnableRobot.X.js"></astro-island>',
        3,
        islandPkg,
      );
      expect(out).toContain('component-url="../../../_astro/RunnableRobot.X.js"');
    });

    it('rewrites renderer-url alongside component-url on the same element', () => {
      const out = rewriteAbsolutePaths(
        '<astro-island component-url="/_astro/Section1ReviewQuiz.Y.js" renderer-url="/_astro/client.Z.js" client="visible"></astro-island>',
        2,
        islandPkg,
      );
      expect(out).toContain('component-url="../../_astro/Section1ReviewQuiz.Y.js"');
      expect(out).toContain('renderer-url="../../_astro/client.Z.js"');
      expect(out).toContain('client="visible"');
    });

    it('rewrites before-hydration-url when present', () => {
      const out = rewriteAbsolutePaths(
        '<astro-island before-hydration-url="/_astro/before.W.js"></astro-island>',
        1,
        islandPkg,
      );
      expect(out).toContain('before-hydration-url="../_astro/before.W.js"');
    });

    it('strips island URL attributes that target out-of-bundle paths', () => {
      const out = rewriteAbsolutePaths(
        '<astro-island component-url="/foo/bar.js" client="load"></astro-island>',
        1,
        islandPkg,
      );
      expect(out).not.toContain('component-url');
      expect(out).toContain('client="load"');
    });

    it('leaves protocol-absolute and already-relative island URLs alone', () => {
      const html =
        '<astro-island component-url="https://x.com/y.js" renderer-url="../_astro/already.js"></astro-island>';
      expect(rewriteAbsolutePaths(html, 2, islandPkg)).toBe(html);
    });

    it('is idempotent — running twice yields the same output', () => {
      const html = '<astro-island component-url="/_astro/RunnableRobot.X.js"></astro-island>';
      const once = rewriteAbsolutePaths(html, 3, islandPkg);
      const twice = rewriteAbsolutePaths(once, 3, islandPkg);
      expect(twice).toBe(once);
    });

    it('preserves all non-URL attributes verbatim (props, opts, ssr, etc.)', () => {
      const html =
        '<astro-island uid="abc" prefix="r1" component-url="/_astro/RunnableRobot.X.js" component-export="default" props="{&quot;a&quot;:1}" ssr client="visible" opts="{&quot;name&quot;:&quot;X&quot;}" await-children></astro-island>';
      const out = rewriteAbsolutePaths(html, 2, islandPkg);
      expect(out).toContain('uid="abc"');
      expect(out).toContain('prefix="r1"');
      expect(out).toContain('component-export="default"');
      expect(out).toContain('props="{&quot;a&quot;:1}"');
      expect(out).toContain('ssr');
      expect(out).toContain('client="visible"');
      expect(out).toContain('opts="{&quot;name&quot;:&quot;X&quot;}"');
      expect(out).toContain('await-children');
      expect(out).toContain('component-url="../../_astro/RunnableRobot.X.js"');
    });
  });
});

describe('rewriteAstroJsPaths', () => {
  it('rewrites double-quoted /_astro/ string literals to ./', () => {
    const src = 'new Worker(new URL("/_astro/foo.worker-x.js", import.meta.url))';
    expect(rewriteAstroJsPaths(src)).toBe('new Worker(new URL("./foo.worker-x.js", import.meta.url))');
  });
  it('rewrites single-quoted variants', () => {
    expect(rewriteAstroJsPaths(`import('/_astro/x.js')`)).toBe(`import('./x.js')`);
  });
  it('leaves backtick template literals alone (rare; safer to skip)', () => {
    const src = 'fetch(`/_astro/x.js`)';
    expect(rewriteAstroJsPaths(src)).toBe(src);
  });
  it('is idempotent', () => {
    const src = 'new URL("/_astro/x.js", import.meta.url)';
    const once = rewriteAstroJsPaths(src);
    expect(rewriteAstroJsPaths(once)).toBe(once);
  });
  it('does not touch other absolute paths', () => {
    const src = 'fetch("/api/x")';
    expect(rewriteAstroJsPaths(src)).toBe(src);
  });
});

describe('addAstroTransitionPersist', () => {
  it('adds persist attr to <link rel="stylesheet">', () => {
    const out = addAstroTransitionPersist('<link rel="stylesheet" href="../_astro/index.D6BdUZ5X.css">');
    expect(out).toContain('data-astro-transition-persist="stylesheet:index.D6BdUZ5X.css"');
  });

  it('adds persist attr to <link rel="modulepreload">', () => {
    const out = addAstroTransitionPersist('<link rel="modulepreload" href="../_astro/page.js">');
    expect(out).toContain('data-astro-transition-persist="modulepreload:page.js"');
  });

  it('adds persist attr to <link rel="preload">', () => {
    const out = addAstroTransitionPersist('<link rel="preload" as="style" href="../_astro/x.css">');
    expect(out).toContain('data-astro-transition-persist="preload:x.css"');
  });

  it('adds persist attr to <script type="module" src="...">', () => {
    const out = addAstroTransitionPersist('<script type="module" src="../_astro/page.js"></script>');
    expect(out).toContain('data-astro-transition-persist="module:page.js"');
  });

  it('adds persist attr to the lernkit runtime <script>', () => {
    const out = addAstroTransitionPersist('<script src="../lernkit-runtime/scorm12.js"></script>');
    expect(out).toContain('data-astro-transition-persist="script:scorm12.js"');
  });

  it('uses identical persist ids regardless of depth-prefix in href/src', () => {
    const a = addAstroTransitionPersist('<link rel="stylesheet" href="../_astro/x.css">');
    const b = addAstroTransitionPersist('<link rel="stylesheet" href="../../../_astro/x.css">');
    const idA = a.match(/data-astro-transition-persist="([^"]+)"/)?.[1];
    const idB = b.match(/data-astro-transition-persist="([^"]+)"/)?.[1];
    expect(idA).toBe('stylesheet:x.css');
    expect(idA).toBe(idB);
  });

  it('does not double-add when the attribute is already present', () => {
    const html =
      '<link rel="stylesheet" href="x.css" data-astro-transition-persist="stylesheet:x.css">';
    expect(addAstroTransitionPersist(html)).toBe(html);
  });

  it('skips inline scripts (no src) and inline styles', () => {
    const html = '<style>.x{}</style><script>console.log("hi")</script>';
    expect(addAstroTransitionPersist(html)).toBe(html);
  });

  it('skips <link> with non-asset rel (canonical, sitemap, icon, etc.)', () => {
    const html =
      '<link rel="canonical" href="https://x.com"><link rel="sitemap" href="/foo.xml"><link rel="icon" href="/favicon.svg">';
    expect(addAstroTransitionPersist(html)).toBe(html);
  });

  it('skips classic <script src> that is NOT the lernkit runtime', () => {
    const html = '<script src="https://cdn.example.com/lib.js"></script>';
    expect(addAstroTransitionPersist(html)).toBe(html);
  });

  it('is idempotent — running twice yields the same output', () => {
    const html = '<link rel="stylesheet" href="../_astro/x.css">';
    const once = addAstroTransitionPersist(html);
    const twice = addAstroTransitionPersist(once);
    expect(twice).toBe(once);
  });

  it('keeps stylesheet vs preload of the same file as distinct persist ids', () => {
    const out = addAstroTransitionPersist(
      '<link rel="preload" as="style" href="../_astro/x.css"><link rel="stylesheet" href="../_astro/x.css">',
    );
    expect(out).toContain('data-astro-transition-persist="preload:x.css"');
    expect(out).toContain('data-astro-transition-persist="stylesheet:x.css"');
  });
});

describe('harmoniseStylesheets', () => {
  const allCss = new Set(['_astro/index.D6BdUZ5X.css', '_astro/ec.j8ofn.css']);

  it('appends missing stylesheets just before </head> with the right depth-prefix', () => {
    const html = '<head><link rel="stylesheet" href="../_astro/index.D6BdUZ5X.css"></head>';
    const out = harmoniseStylesheets(html, 1, allCss);
    expect(out).toContain('href="../_astro/ec.j8ofn.css"');
    expect(out).toContain('data-astro-transition-persist="stylesheet:ec.j8ofn.css"');
  });

  it('uses the right depth-prefix per page', () => {
    const html = '<head></head>';
    const depth1 = harmoniseStylesheets(html, 1, allCss);
    const depth3 = harmoniseStylesheets(html, 3, allCss);
    expect(depth1).toContain('href="../_astro/index.D6BdUZ5X.css"');
    expect(depth3).toContain('href="../../../_astro/index.D6BdUZ5X.css"');
  });

  it('is a no-op when every stylesheet is already present', () => {
    const html =
      '<head><link rel="stylesheet" href="../_astro/index.D6BdUZ5X.css"><link rel="stylesheet" href="../_astro/ec.j8ofn.css"></head>';
    expect(harmoniseStylesheets(html, 1, allCss)).toBe(html);
  });

  it('matches presence on basename, not on full href', () => {
    const html =
      '<head><link rel="stylesheet" href="../../../_astro/index.D6BdUZ5X.css"><link rel="stylesheet" href="../../../_astro/ec.j8ofn.css"></head>';
    expect(harmoniseStylesheets(html, 3, allCss)).toBe(html);
  });

  it('returns input unchanged when allStylesheets is empty', () => {
    const html = '<head></head>';
    expect(harmoniseStylesheets(html, 2, new Set())).toBe(html);
  });

  it('falls back to <head ...> insertion when </head> is missing', () => {
    const html = '<head data-foo>broken';
    const out = harmoniseStylesheets(html, 0, new Set(['_astro/x.css']));
    expect(out).toMatch(/<head data-foo><link rel="stylesheet"/);
  });
});

describe('inlineStylesheets', () => {
  it('replaces a matching <link> with a <style> carrying the CSS contents', () => {
    const html = '<link rel="stylesheet" href="../_astro/ec.j8ofn.css" data-astro-transition-persist="stylesheet:ec.j8ofn.css">';
    const inlined = new Map([['ec.j8ofn.css', '.code{color:red}']]);
    const out = inlineStylesheets(html, inlined);
    expect(out).toContain('<style data-astro-transition-persist="style:ec.j8ofn.css">.code{color:red}</style>');
    expect(out).not.toContain('<link');
  });

  it('matches by basename across different depth-prefixes', () => {
    const inlined = new Map([['ec.X.css', '.x{}']]);
    const a = inlineStylesheets('<link rel="stylesheet" href="../_astro/ec.X.css">', inlined);
    const b = inlineStylesheets('<link rel="stylesheet" href="../../../_astro/ec.X.css">', inlined);
    expect(a).toBe('<style data-astro-transition-persist="style:ec.X.css">.x{}</style>');
    expect(b).toBe('<style data-astro-transition-persist="style:ec.X.css">.x{}</style>');
  });

  it('leaves <link> tags whose basename is not in the inline map', () => {
    const inlined = new Map([['ec.j8ofn.css', '.x{}']]);
    const html = '<link rel="stylesheet" href="../_astro/index.D6.css">';
    expect(inlineStylesheets(html, inlined)).toBe(html);
  });

  it('replaces every matching <link> when multiple are present', () => {
    const inlined = new Map([['ec.j8ofn.css', '.ec{}']]);
    const html =
      '<link rel="stylesheet" href="../_astro/ec.j8ofn.css"><link rel="stylesheet" href="../../_astro/ec.j8ofn.css">';
    const out = inlineStylesheets(html, inlined);
    expect((out.match(/<style/g) ?? []).length).toBe(2);
    expect(out).not.toContain('<link');
  });

  it('is a no-op when the inline map is empty', () => {
    const html = '<link rel="stylesheet" href="../_astro/ec.j8ofn.css">';
    expect(inlineStylesheets(html, new Map())).toBe(html);
  });

  it('preserves non-link surrounding markup', () => {
    const inlined = new Map([['ec.X.css', '.x{}']]);
    const html =
      '<head><title>X</title><link rel="stylesheet" href="../_astro/ec.X.css"></head>';
    const out = inlineStylesheets(html, inlined);
    expect(out).toContain('<title>X</title>');
    expect(out).toContain('<style');
    expect(out).toContain('</head>');
  });
});
