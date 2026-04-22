import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import nunjucks from 'nunjucks';

import type { CoursePackage } from '../types.js';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(here, 'templates');
const MANIFEST_TEMPLATE = 'imsmanifest.xml.njk';

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(TEMPLATES_DIR, { noCache: false }), {
  autoescape: true,
  throwOnUndefined: false,
  trimBlocks: true,
  lstripBlocks: true,
});

export interface ManifestContext {
  readonly pkg: CoursePackage;
}

/**
 * Render the imsmanifest.xml for SCORM 1.2. The template lives as a file
 * so it can be reviewed, version-controlled, and linted independently.
 *
 * SCORM 1.2 manifest shape (per ADL SCORM 1.2 conformance guide):
 * - root `<manifest>` with `identifier`, `version`, and the IMS CP + ADLCP namespaces
 * - `<metadata>` declaring `schema=ADL SCORM` and `schemaversion=1.2`
 * - one `<organizations default="...">` with at least one `<organization>`
 * - `<resources>` with one `<resource adlcp:scormtype="sco">` per lesson
 */
export async function renderScorm12Manifest(ctx: ManifestContext): Promise<string> {
  // Nunjucks' async render is more ergonomic than callbacks for our case.
  return new Promise<string>((resolve, reject) => {
    env.render(MANIFEST_TEMPLATE, buildTemplateData(ctx), (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      if (result === null) {
        reject(new Error('Nunjucks rendered null for the SCORM 1.2 manifest'));
        return;
      }
      resolve(result);
    });
  });
}

interface TemplateLesson {
  readonly identifier: string;
  readonly href: string;
  readonly title: string;
  readonly files: readonly string[];
}

interface TemplateData {
  readonly manifestIdentifier: string;
  readonly courseVersion: string;
  readonly language: string;
  readonly courseTitle: string;
  readonly courseDescription: string;
  readonly organizationIdentifier: string;
  readonly organizationTitle: string;
  readonly defaultOrganizationIdentifier: string;
  readonly lessons: readonly TemplateLesson[];
  readonly masteryScorePercent: number | null;
}

function buildTemplateData(ctx: ManifestContext): TemplateData {
  const { pkg } = ctx;
  const courseId = pkg.metadata.courseId;

  const lessons: TemplateLesson[] = pkg.lessons.map((lesson, index) => ({
    identifier: `res-${slug(lesson.id)}-${index + 1}`,
    href: lesson.href,
    title: lesson.title,
    // The `<resource>` element lists every file the SCO depends on.
    // The entry file (href) must be first in the list per some LMS quirks.
    files: dedupe([lesson.href, ...lesson.assets]),
  }));

  const orgId = `org-${slug(pkg.metadata.organization?.identifier ?? 'lernkit')}`;

  return {
    manifestIdentifier: `manifest-${slug(courseId)}`,
    courseVersion: pkg.metadata.version,
    language: pkg.metadata.language,
    courseTitle: pkg.metadata.title,
    courseDescription: pkg.metadata.description ?? '',
    organizationIdentifier: orgId,
    organizationTitle: pkg.metadata.organization?.name ?? 'Lernkit',
    defaultOrganizationIdentifier: orgId,
    lessons,
    masteryScorePercent:
      pkg.metadata.masteryScore === undefined ? null : Math.round(clamp01(pkg.metadata.masteryScore) * 100),
  };
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function dedupe<T>(xs: readonly T[]): T[] {
  return Array.from(new Set(xs));
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Quick XML well-formedness sniff — the Nunjucks template should produce clean XML. */
export async function readBundledManifestTemplate(): Promise<string> {
  return readFile(join(TEMPLATES_DIR, MANIFEST_TEMPLATE), 'utf8');
}
