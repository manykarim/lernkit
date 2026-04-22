import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CoursePackage } from '../types.js';
import { buildScorm12Zip, isForbiddenEntry, toPosix, zipFilenameFor } from './zip.js';

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
});
