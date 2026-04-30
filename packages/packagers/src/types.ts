/**
 * Shared types used across the packagers package.
 *
 * Philosophy: the packager input is a *unified* manifest VO described here.
 * Every output format (SCORM 1.2, SCORM 2004, cmi5, xAPI bundle, plain HTML)
 * consumes the same input. See ADR 0015.
 */

export interface Organization {
  /** Human-readable org name — appears in some LMS chrome. */
  readonly name: string;
  /** Legal-ish identifier. Optional. */
  readonly identifier?: string;
}

export interface CourseMetadata {
  /** Globally unique ID for the course. Used as the manifest identifier. Kebab-case ASCII recommended. */
  readonly courseId: string;
  /** Human-readable course title. Shown in the LMS catalog. */
  readonly title: string;
  /** Short description. May be multi-paragraph; kept under 2000 chars for LMS compat. */
  readonly description?: string;
  /** Semantic version of the course. Bumping this signals re-publish. */
  readonly version: string;
  /** ISO 639-1 language code (e.g. "en", "de"). */
  readonly language: string;
  /** Organization publishing the course. */
  readonly organization?: Organization;
  /** Learning objectives, free-form. */
  readonly objectives?: readonly string[];
  /** @deprecated Course-level mastery is no longer auto-applied per item. Set `Lesson.masteryScore` per lesson instead. Retained for backwards compatibility (e.g. SCORM 2004 packagers may still consume it). */
  readonly masteryScore?: number;
  /** Estimated duration in minutes. */
  readonly estimatedMinutes?: number;
  /**
   * When true, only the entry lesson is declared as a SCO; all other lesson
   * HTMLs become <file> entries of that single SCO. Pairs with SPA-style
   * internal navigation (e.g., Astro View Transitions) so the whole course
   * runs in one SCORM session — `LMSInitialize` and `LMSFinish` each fire
   * exactly once.
   *
   * When false/undefined (default), each lesson is its own SCO.
   */
  readonly singleSco?: boolean;

  /**
   * Identifier of the lesson that is the SCO entry point in single-SCO mode.
   * Must match a `Lesson.id`. When omitted in single-SCO mode, defaults to
   * the first lesson. Ignored in multi-SCO mode.
   */
  readonly entryLessonId?: string;
}

export interface Lesson {
  /** Stable identifier. Becomes the SCO identifier in the manifest. */
  readonly id: string;
  /** Lesson title. Shown in LMS nav chrome. */
  readonly title: string;
  /** Path to the lesson's entry HTML, relative to the built Astro dist root. */
  readonly href: string;
  /** All asset files this lesson depends on, relative to the built Astro dist root. */
  readonly assets: readonly string[];
  /** Per-lesson mastery threshold in [0, 1]. When set, emits <adlcp:masteryscore> on this item. Course-level masteryScore is no longer auto-applied per item; this is opt-in. */
  readonly masteryScore?: number;
}

/** The unified course-package VO. Every packager consumes this shape. */
export interface CoursePackage {
  readonly metadata: CourseMetadata;
  readonly lessons: readonly Lesson[];
  /**
   * Absolute path to the Astro build directory (usually `apps/docs/dist`).
   * Packagers read files from here when building the zip.
   */
  readonly distDir: string;
}

export interface PackagingResult {
  /** The produced zip file as a Buffer. Callers write it to disk. */
  readonly zip: Buffer;
  /** The zip file name we recommend (e.g. `my-course-0.1.0-scorm12.zip`). */
  readonly filename: string;
  /** List of entries inside the zip, for debugging and testing. */
  readonly entries: readonly string[];
  /** Rendered manifest XML, for debugging and conformance diffing. */
  readonly manifest: string;
}

export interface PackagerOptions {
  /**
   * Optional callback to omit files from the produced zip (e.g. sourcemaps,
   * the `.astro/` cache, `__MACOSX` if some upstream tool produced one).
   * Return `true` to INCLUDE the file.
   */
  readonly filter?: (relativePath: string) => boolean;
}
