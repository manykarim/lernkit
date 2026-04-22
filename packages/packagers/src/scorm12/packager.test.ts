import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CoursePackage } from '../types.js';
import { packageScorm12 } from './packager.js';

async function setupDist(tmp: string) {
  await mkdir(join(tmp, '_astro'), { recursive: true });
  await mkdir(join(tmp, 'course', 'welcome'), { recursive: true });
  await mkdir(join(tmp, 'course', 'hello-runnable'), { recursive: true });
  await writeFile(join(tmp, '_astro', 'shared.css'), 'body{}');
  await writeFile(join(tmp, '_astro', 'runtime.js'), 'console.log("x");');
  await writeFile(join(tmp, 'course', 'welcome', 'index.html'), '<!doctype html><title>Welcome</title>');
  await writeFile(join(tmp, 'course', 'hello-runnable', 'index.html'), '<!doctype html><title>Hello Runnable</title>');
}

function fixture(distDir: string): CoursePackage {
  return {
    metadata: {
      courseId: 'intro-to-python',
      title: 'Intro to Python',
      description: 'A short introduction.',
      version: '0.1.0',
      language: 'en',
      organization: { name: 'Lernkit', identifier: 'lernkit' },
      masteryScore: 0.8,
    },
    lessons: [
      {
        id: 'welcome',
        title: 'Welcome',
        href: 'course/welcome/index.html',
        assets: ['_astro/shared.css'],
      },
      {
        id: 'hello-runnable',
        title: 'Your first runnable cell',
        href: 'course/hello-runnable/index.html',
        assets: ['_astro/shared.css', '_astro/runtime.js'],
      },
    ],
    distDir,
  };
}

describe('packageScorm12 — end-to-end', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = join(tmpdir(), `lernkit-pack-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await setupDist(tmp);
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('produces a zip with the expected layout', async () => {
    const result = await packageScorm12(fixture(tmp));
    const expected = [
      '_astro/runtime.js',
      '_astro/shared.css',
      'course/hello-runnable/index.html',
      'course/welcome/index.html',
      'imsmanifest.xml',
      'lernkit-runtime/scorm12.js',
    ].sort();
    expect(result.entries).toEqual(expected);
  });

  it('produces a zip file that reopens via JSZip with the same contents', async () => {
    const result = await packageScorm12(fixture(tmp));
    const z = await JSZip.loadAsync(result.zip);
    const manifest = await z.file('imsmanifest.xml')?.async('string');
    expect(manifest).toBeDefined();
    expect(manifest).toContain('<schema>ADL SCORM</schema>');
    expect(manifest).toContain('<schemaversion>1.2</schemaversion>');
  });

  it('ships the Lernkit runtime under the documented path', async () => {
    const result = await packageScorm12(fixture(tmp));
    expect(result.entries).toContain('lernkit-runtime/scorm12.js');
    const z = await JSZip.loadAsync(result.zip);
    const runtime = await z.file('lernkit-runtime/scorm12.js')?.async('string');
    expect(runtime).toContain('LernkitScorm12');
    expect(runtime).toContain('LMSInitialize');
  });

  it('recommends a safe zip filename with courseId and version', async () => {
    const result = await packageScorm12(fixture(tmp));
    expect(result.filename).toBe('intro-to-python-0.1.0-scorm12.zip');
  });

  it('rejects a CoursePackage with no lessons', async () => {
    const bad: CoursePackage = {
      ...fixture(tmp),
      lessons: [],
    };
    await expect(packageScorm12(bad)).rejects.toThrow(/at least one lesson/);
  });

  it('rejects a CoursePackage with duplicate lesson ids', async () => {
    const bad: CoursePackage = {
      ...fixture(tmp),
      lessons: [
        ...fixture(tmp).lessons,
        {
          id: 'welcome',
          title: 'Dup',
          href: 'course/welcome/index.html',
          assets: [],
        },
      ],
    };
    await expect(packageScorm12(bad)).rejects.toThrow(/Duplicate lesson id/);
  });

  it('rejects masteryScore out of [0, 1]', async () => {
    const bad: CoursePackage = {
      ...fixture(tmp),
      metadata: { ...fixture(tmp).metadata, masteryScore: 1.5 },
    };
    await expect(packageScorm12(bad)).rejects.toThrow(/masteryScore/);
  });
});
