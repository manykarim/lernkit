import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import nunjucks from 'nunjucks';

import type { CoursePackage, Lesson } from '../types.js';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(here, 'templates');
const MANIFEST_TEMPLATE = 'imsmanifest.xml.njk';
const METADATA_TEMPLATE = 'metadata.xml.njk';

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
 * - `<metadata>` declaring `schema=ADL SCORM` and `schemaversion=1.2`, with the LOM
 *   externalised via `<adlcp:location>metadata.xml</adlcp:location>`
 * - one `<organizations default="...">` with at least one `<organization>`
 * - `<resources>` with one `<resource adlcp:scormtype="sco">` per lesson plus a
 *   single shared `<resource adlcp:scormtype="asset">` referenced via `<dependency>`
 */
export async function renderScorm12Manifest(ctx: ManifestContext): Promise<string> {
  return renderTemplate(MANIFEST_TEMPLATE, buildTemplateData(ctx));
}

/**
 * Render the external LOM metadata.xml that the manifest's
 * `<adlcp:location>metadata.xml</adlcp:location>` points at.
 */
export async function renderScorm12Metadata(ctx: ManifestContext): Promise<string> {
  const { pkg } = ctx;
  return renderTemplate(METADATA_TEMPLATE, {
    language: pkg.metadata.language,
    courseTitle: pkg.metadata.title,
    courseDescription: pkg.metadata.description ?? '',
  });
}

function renderTemplate(template: string, data: Record<string, unknown>): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    env.render(template, data, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      if (result === null) {
        reject(new Error(`Nunjucks rendered null for template ${template}`));
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
  readonly masteryScorePercent: number | null;
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
  readonly sharedAssets: readonly string[];
  readonly singleSco: boolean;
  readonly entryHref: string | null;
  readonly allLessonHrefs: readonly string[];
  readonly entryMasteryScorePercent: number | null;
  readonly [key: string]: unknown;
}

/**
 * Files referenced by two or more lessons land in a single shared `<resource>`
 * so strict LMS importers don't synthesise duplicate symbols when the same path
 * appears under multiple SCOs.
 */
export function computeSharedAssets(lessons: readonly Lesson[]): string[] {
  const counts = new Map<string, number>();
  for (const lesson of lessons) {
    const unique = new Set<string>(lesson.assets);
    for (const path of unique) {
      counts.set(path, (counts.get(path) ?? 0) + 1);
    }
  }
  const shared: string[] = [];
  for (const [path, count] of counts) {
    if (count >= 2) shared.push(path);
  }
  return shared.sort();
}

function buildTemplateData(ctx: ManifestContext): TemplateData {
  const { pkg } = ctx;
  const courseId = pkg.metadata.courseId;
  const singleSco = pkg.metadata.singleSco === true;

  const orgId = `org-${slug(pkg.metadata.organization?.identifier ?? 'lernkit')}`;

  if (singleSco) {
    const entryLesson =
      (pkg.metadata.entryLessonId !== undefined
        ? pkg.lessons.find((l) => l.id === pkg.metadata.entryLessonId)
        : undefined) ?? pkg.lessons[0];

    if (!entryLesson) {
      throw new Error('CoursePackage.lessons must contain at least one lesson for single-SCO mode');
    }

    const allLessonHrefs = pkg.lessons.map((l) => l.href);
    const lessonHrefSet = new Set(allLessonHrefs);
    const allAssets = new Set<string>();
    for (const lesson of pkg.lessons) {
      for (const asset of lesson.assets) {
        if (!lessonHrefSet.has(asset)) allAssets.add(asset);
      }
    }
    const sharedAssets = Array.from(allAssets).sort();

    const entryMasteryScorePercent =
      pkg.metadata.masteryScore === undefined ? null : Math.round(clamp01(pkg.metadata.masteryScore) * 100);

    return {
      manifestIdentifier: `manifest-${slug(courseId)}`,
      courseVersion: pkg.metadata.version,
      language: pkg.metadata.language,
      courseTitle: pkg.metadata.title,
      courseDescription: pkg.metadata.description ?? '',
      organizationIdentifier: orgId,
      organizationTitle: pkg.metadata.organization?.name ?? 'Lernkit',
      defaultOrganizationIdentifier: orgId,
      lessons: [],
      sharedAssets,
      singleSco: true,
      entryHref: entryLesson.href,
      allLessonHrefs,
      entryMasteryScorePercent,
    };
  }

  const sharedAssets = computeSharedAssets(pkg.lessons);
  const sharedSet = new Set(sharedAssets);

  const lessons: TemplateLesson[] = pkg.lessons.map((lesson, index) => {
    const uniqueAssets = lesson.assets.filter((a) => !sharedSet.has(a));
    return {
      identifier: `res-${slug(lesson.id)}-${index + 1}`,
      href: lesson.href,
      title: lesson.title,
      files: dedupe([lesson.href, ...uniqueAssets]),
      masteryScorePercent: lesson.masteryScore === undefined ? null : Math.round(clamp01(lesson.masteryScore) * 100),
    };
  });

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
    sharedAssets,
    singleSco: false,
    entryHref: null,
    allLessonHrefs: [],
    entryMasteryScorePercent: null,
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
