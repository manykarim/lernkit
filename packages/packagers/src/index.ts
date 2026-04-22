export type { CoursePackage, CourseMetadata, Lesson, Organization, PackagerOptions, PackagingResult } from './types.js';

export * as scorm12 from './scorm12/index.js';
export { packageScorm12, writePackageTo } from './scorm12/packager.js';
