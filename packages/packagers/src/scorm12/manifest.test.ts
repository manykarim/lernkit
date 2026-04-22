import { describe, expect, it } from 'vitest';
import type { CoursePackage } from '../types.js';
import { renderScorm12Manifest } from './manifest.js';

function fixture(overrides?: Partial<CoursePackage>): CoursePackage {
  return {
    metadata: {
      courseId: 'intro-to-python',
      title: 'Intro to Python',
      description: 'A short introduction.',
      version: '0.1.0',
      language: 'en',
      organization: { name: 'Lernkit', identifier: 'lernkit' },
      masteryScore: 0.8,
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

  it('puts the course title and language into an imsmd:lom general block', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    expect(xml).toMatch(/<imsmd:langstring xml:lang="en">Intro to Python<\/imsmd:langstring>/);
    expect(xml).toContain('<imsmd:language>en</imsmd:language>');
  });

  it('renders one <item> and one <resource> per lesson, with scormtype=sco', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    const itemCount = (xml.match(/<item /g) ?? []).length;
    const resourceCount = (xml.match(/<resource /g) ?? []).length;
    expect(itemCount).toBe(2);
    expect(resourceCount).toBe(2);
    const scoAttrs = xml.match(/adlcp:scormtype="sco"/g) ?? [];
    expect(scoAttrs.length).toBe(2);
  });

  it('lists every asset as a <file> under each resource', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    expect(xml).toContain('href="_astro/index.abc.css"');
    expect(xml).toContain('href="_astro/hello.def.js"');
  });

  it('embeds masteryscore as integer percent when masteryScore is set', async () => {
    const xml = await renderScorm12Manifest({ pkg: fixture() });
    expect(xml).toMatch(/<adlcp:masteryscore>80<\/adlcp:masteryscore>/);
  });

  it('omits masteryscore entirely when not provided', async () => {
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

  it('escapes angle-brackets and ampersands in user-supplied text', async () => {
    const xml = await renderScorm12Manifest({
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
