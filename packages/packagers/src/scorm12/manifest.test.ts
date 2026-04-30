import { describe, expect, it } from 'vitest';
import type { CoursePackage } from '../types.js';
import { computeSharedAssets, renderScorm12Manifest, renderScorm12Metadata } from './manifest.js';

function fixture(overrides?: Partial<CoursePackage>): CoursePackage {
  return {
    metadata: {
      courseId: 'intro-to-python',
      title: 'Intro to Python',
      description: 'A short introduction.',
      version: '0.1.0',
      language: 'en',
      organization: { name: 'Lernkit', identifier: 'lernkit' },
      estimatedMinutes: 30,
    },
    lessons: [
      {
        id: 'welcome',
        title: 'Welcome',
        href: 'course/welcome/index.html',
        assets: ['_astro/index.abc.css'],
      },
      {
        id: 'hello-runnable',
        title: 'Your first runnable cell',
        href: 'course/hello-runnable/index.html',
        assets: ['_astro/index.abc.css', '_astro/hello.def.js'],
      },
    ],
    distDir: '/tmp/fake-dist',
    ...overrides,
  };
}

describe('renderScorm12Manifest', () => {
  it('emits SCORM 1.2 schemaversion, schema, and the required xmlns block', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    expect(xml).toContain('<schema>ADL SCORM</schema>');
    expect(xml).toContain('<schemaversion>1.2</schemaversion>');
    expect(xml).toContain('xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"');
    expect(xml).toContain('xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"');
  });

  it('declares the XML prolog with lowercase encoding="utf-8"', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    expect(xml).toMatch(/encoding="utf-8"/);
  });

  it('externalises the LOM via <adlcp:location>metadata.xml</adlcp:location>', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    expect(xml).toContain('<adlcp:location>metadata.xml</adlcp:location>');
  });

  it('does not declare or use the imsmd namespace inline', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    expect(xml).not.toContain('imsmd:');
  });

  it('omits the redundant structure="hierarchical" attribute', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    expect(xml).not.toContain('structure="hierarchical"');
  });

  it('renders one <item> and one <resource> per lesson, with scormtype=sco', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    const itemCount = (xml.match(/<item /g) ?? []).length;
    const scoMatches = xml.match(/adlcp:scormtype="sco"/g) ?? [];
    expect(itemCount).toBe(2);
    expect(scoMatches.length).toBe(2);
  });

  it('emits a single shared-asset resource when two or more lessons share a file', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    const sharedResMatches = xml.match(/<resource identifier="shared-assets"/g) ?? [];
    expect(sharedResMatches.length).toBe(1);
    expect(xml).toContain('adlcp:scormtype="asset"');
    const dependencyMatches = xml.match(/<dependency identifierref="shared-assets"\/>/g) ?? [];
    expect(dependencyMatches.length).toBe(2);
  });

  it('lists per-lesson unique files under each SCO resource (shared file only listed once on the shared resource)', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    const sharedFileMatches = xml.match(/href="_astro\/index\.abc\.css"/g) ?? [];
    expect(sharedFileMatches.length).toBe(1);
    expect(xml).toContain('href="_astro/hello.def.js"');
  });

  it('omits the shared-asset resource entirely when no files are shared', async () => {
    const xml = await renderScorm12Manifest({
      pkg: fixture({
        lessons: [
          { id: 'a', title: 'A', href: 'a/index.html', assets: ['a/only.css'] },
          { id: 'b', title: 'B', href: 'b/index.html', assets: ['b/only.css'] },
        ],
      }),
    });
    expect(xml).not.toContain('shared-assets');
    expect(xml).not.toContain('<dependency');
    expect(xml).not.toContain('adlcp:scormtype="asset"');
  });

  it('embeds masteryscore as integer percent only when the lesson opts in', async () => {
    const base = fixture();
    const [first, second] = base.lessons;
    if (!first || !second) throw new Error('fixture must have at least two lessons');
    const xml = await renderScorm12Manifest({
      pkg: {
        ...base,
        lessons: [{ ...first, masteryScore: 0.8 }, second],
      },
    });
    expect(xml).toMatch(/<adlcp:masteryscore>80<\/adlcp:masteryscore>/);
    const masteryCount = (xml.match(/<adlcp:masteryscore>/g) ?? []).length;
    expect(masteryCount).toBe(1);
  });

  it('does not auto-apply course-level masteryScore to items', async () => {
    const xml = await renderScorm12Manifest({
      pkg: fixture({
        metadata: {
          courseId: 'x',
          title: 'X',
          version: '0.0.1',
          language: 'en',
          masteryScore: 0.9,
        },
      }),
    });
    expect(xml).not.toContain('adlcp:masteryscore');
  });

  it('omits masteryscore entirely when no lesson opts in', async () => {
    const xml = await renderScorm12Manifest({
      pkg: fixture({
        metadata: {
          courseId: 'x',
          title: 'X',
          version: '0.0.1',
          language: 'en',
        },
      }),
    });
    expect(xml).not.toContain('adlcp:masteryscore');
  });

  it('uses the organization default pointer consistently', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    const defaultMatch = xml.match(/<organizations default="([^"]+)">/);
    const orgMatch = xml.match(/<organization identifier="([^"]+)"/);
    expect(defaultMatch).not.toBeNull();
    expect(orgMatch).not.toBeNull();
    expect(defaultMatch?.[1]).toBe(orgMatch?.[1]);
  });

  it('produces well-formed XML (single root, balanced tags)', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    expect(xml.match(/^<\?xml/)).not.toBeNull();
    const rootOpen = (xml.match(/<manifest\b/g) ?? []).length;
    const rootClose = (xml.match(/<\/manifest>/g) ?? []).length;
    expect(rootOpen).toBe(1);
    expect(rootClose).toBe(1);
  });

  it('escapes angle-brackets and ampersands in user-supplied text (organization name)', async () => {
    const xml = await renderScorm12Manifest({
      pkg: fixture({
        metadata: {
          courseId: 'x',
          title: 'X',
          version: '0.0.1',
          language: 'en',
          organization: { name: 'A & B <danger>', identifier: 'lernkit' },
        },
      }),
    });
    expect(xml).toContain('A &amp; B &lt;danger&gt;');
    expect(xml).not.toContain('<danger>');
  });
});

describe('single-SCO mode', () => {
  function singleScoFixture() {
    return {
      ...fixture(),
      metadata: { ...fixture().metadata, singleSco: true, masteryScore: 0.8, entryLessonId: 'welcome' },
    };
  }

  it('emits exactly one organization item with one identifierref', async () => {
    const xml = await renderScorm12Manifest({ pkg: singleScoFixture() });
    expect((xml.match(/<item /g) ?? []).length).toBe(1);
    const ref = xml.match(/<item [^>]*identifierref="([^"]+)"/);
    expect(ref?.[1]).toBe('res-entry');
  });

  it('emits exactly one SCO resource and one (or zero) asset resource', async () => {
    const xml = await renderScorm12Manifest({ pkg: singleScoFixture() });
    expect((xml.match(/adlcp:scormtype="sco"/g) ?? []).length).toBe(1);
    const assetCount = (xml.match(/adlcp:scormtype="asset"/g) ?? []).length;
    expect(assetCount).toBeLessThanOrEqual(1);
  });

  it('lists every lesson href as a <file> entry of the entry SCO', async () => {
    const xml = await renderScorm12Manifest({ pkg: singleScoFixture() });
    for (const lesson of singleScoFixture().lessons) {
      expect(xml).toContain(`<file href="${lesson.href}"/>`);
    }
  });

  it('uses the configured entryLessonId to choose href on the SCO resource', async () => {
    const pkg = singleScoFixture();
    const xml = await renderScorm12Manifest({ pkg });
    expect(xml).toMatch(/<resource [^>]*identifier="res-entry"[^>]*href="course\/welcome\/index\.html"/);
  });

  it('falls back to the first lesson when entryLessonId is not provided', async () => {
    const pkg = { ...singleScoFixture(), metadata: { ...singleScoFixture().metadata, entryLessonId: undefined } };
    const xml = await renderScorm12Manifest({ pkg });
    const firstLesson = pkg.lessons[0];
    if (!firstLesson) throw new Error('test fixture must have at least one lesson');
    expect(xml).toMatch(
      new RegExp(`<resource [^>]*identifier="res-entry"[^>]*href="${firstLesson.href.replace(/\//g, '\\/')}"`),
    );
  });

  it('emits course-level masteryscore on the single item when configured', async () => {
    const xml = await renderScorm12Manifest({ pkg: singleScoFixture() });
    expect(xml).toMatch(/<adlcp:masteryscore>80<\/adlcp:masteryscore>/);
  });

  it('omits masteryscore when course masteryScore is not set', async () => {
    const pkg = { ...singleScoFixture(), metadata: { ...singleScoFixture().metadata, masteryScore: undefined } };
    const xml = await renderScorm12Manifest({ pkg });
    expect(xml).not.toContain('adlcp:masteryscore');
  });

  it('multi-SCO behaviour is unchanged when singleSco is false/unset', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    expect((xml.match(/adlcp:scormtype="sco"/g) ?? []).length).toBe(2);
  });
});

describe('computeSharedAssets', () => {
  it('returns files referenced by two or more lessons', () => {
    const shared = computeSharedAssets([
      { id: 'a', title: 'A', href: 'a.html', assets: ['x.css', 'a.js'] },
      { id: 'b', title: 'B', href: 'b.html', assets: ['x.css', 'b.js'] },
      { id: 'c', title: 'C', href: 'c.html', assets: ['x.css', 'a.js'] },
    ]);
    expect(shared).toEqual(['a.js', 'x.css']);
  });

  it('returns an empty array when no files are shared', () => {
    const shared = computeSharedAssets([
      { id: 'a', title: 'A', href: 'a.html', assets: ['only-a.css'] },
      { id: 'b', title: 'B', href: 'b.html', assets: ['only-b.css'] },
    ]);
    expect(shared).toEqual([]);
  });

  it('does not double-count when a single lesson lists the same asset twice', () => {
    const shared = computeSharedAssets([
      { id: 'a', title: 'A', href: 'a.html', assets: ['x.css', 'x.css'] },
      { id: 'b', title: 'B', href: 'b.html', assets: ['y.css'] },
    ]);
    expect(shared).toEqual([]);
  });
});

describe('renderScorm12Metadata', () => {
  it('returns well-formed XML with the LOM default namespace and no imsmd: prefix', async () => {
    const xml = await renderScorm12Metadata({ pkg: fixture() });
    expect(xml).toMatch(/^<\?xml/);
    expect(xml).toContain('<lom xmlns="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1"');
    expect(xml).not.toContain('imsmd:');
  });

  it('lands the title and language correctly', async () => {
    const xml = await renderScorm12Metadata({ pkg: fixture() });
    expect(xml).toMatch(/<langstring xml:lang="en">Intro to Python<\/langstring>/);
    expect(xml).toContain('<language>en</language>');
  });

  it('omits <description> when none is given', async () => {
    const xml = await renderScorm12Metadata({
      pkg: fixture({
        metadata: {
          courseId: 'x',
          title: 'X',
          version: '0.0.1',
          language: 'en',
        },
      }),
    });
    expect(xml).not.toContain('<description>');
  });

  it('emits <description> when courseDescription is set', async () => {
    const xml = await renderScorm12Metadata({ pkg: fixture() });
    expect(xml).toContain('<description><langstring xml:lang="en">A short introduction.</langstring></description>');
  });

  it('escapes angle-brackets and ampersands in user-supplied text', async () => {
    const xml = await renderScorm12Metadata({
      pkg: fixture({
        metadata: {
          courseId: 'x',
          title: 'A & B <danger>',
          version: '0.0.1',
          language: 'en',
        },
      }),
    });
    expect(xml).toContain('A &amp; B &lt;danger&gt;');
    expect(xml).not.toContain('<danger>');
  });
});
