/**
 * Lernkit framework configuration.
 *
 * This is the single config surface a consumer edits to customize their Lernkit deployment.
 * Phase 0 ships the schema shape only; packagers land in Phase 1 (ADR 0015).
 *
 * Related ADRs:
 *  - ADR 0014 (MIT license)
 *  - ADR 0015 (one-source-many-outputs build pipeline)
 *  - ADR 0022 (OSS single-tenant scope)
 */

export interface LernkitConfig {
  /** Site identity */
  readonly site: {
    readonly title: string;
    readonly description: string;
    readonly url?: string;
  };

  /** Output targets. Per ADR 0015, MDX sources fan out to these packagers. */
  readonly packages?: {
    readonly scorm12?: boolean;
    readonly scorm2004_4th?: boolean;
    readonly cmi5?: boolean;
    readonly xapiBundle?: boolean;
    /** Opt-in per OQ-P1-6 (2026-04-21): `plain-html` defaults to private. */
    readonly plainHtml?: {
      readonly publicAccess: boolean;
      readonly publicUrl?: string;
    };
  };

  /** LRS endpoint (self-hosted Yet Analytics SQL LRS, ADR 0013). */
  readonly lrs?: {
    readonly url: string;
    readonly retentionDays?: number;
  };
}

export function defineConfig(config: LernkitConfig): LernkitConfig {
  return config;
}

export default defineConfig({
  site: {
    title: 'Lernkit',
    description: 'Code-first authoring for technical training.',
  },
  packages: {
    scorm12: true,
    scorm2004_4th: false,
    cmi5: true,
    xapiBundle: false,
    plainHtml: {
      publicAccess: false,
    },
  },
});
