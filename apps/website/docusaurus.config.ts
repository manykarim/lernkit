import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Lernkit',
  tagline: 'Code-first authoring for technical training',
  favicon: 'img/favicon.svg',

  url: 'https://manykarim.github.io',
  baseUrl: '/lernkit/',

  organizationName: 'manykarim',
  projectName: 'lernkit',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/manykarim/lernkit/edit/main/apps/website/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    // ADRs are mirrored from docs/adr/ by scripts/sync-adrs.mjs as a pre-build
    // step (see package.json predev/prestart/prebuild). It runs before
    // Docusaurus's docs plugin scans the docs/ tree, so the ADR pages exist
    // when the route map is built. A Docusaurus plugin's loadContent runs in
    // parallel with the docs plugin's scan, which races and loses on a fresh
    // checkout.
    [
      'docusaurus-plugin-typedoc',
      {
        id: 'packagers-api',
        entryPoints: ['../../packages/packagers/src/index.ts'],
        tsconfig: '../../packages/packagers/tsconfig.json',
        out: 'docs/api/packagers',
        sidebar: { autoConfiguration: true, pretty: true },
        readme: 'none',
        plugin: ['typedoc-plugin-markdown'],
      },
    ],
    [
      'docusaurus-plugin-typedoc',
      {
        id: 'tracker-api',
        entryPoints: ['../../packages/tracker/src/index.ts'],
        tsconfig: '../../packages/tracker/tsconfig.json',
        out: 'docs/api/tracker',
        sidebar: { autoConfiguration: true, pretty: true },
        readme: 'none',
        plugin: ['typedoc-plugin-markdown'],
      },
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Lernkit',
      logo: {
        alt: 'Lernkit',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'reference',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/api/packagers',
          position: 'left',
          label: 'API',
        },
        {
          to: '/architecture',
          position: 'left',
          label: 'Architecture',
        },
        {
          href: 'https://github.com/manykarim/lernkit',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Quickstart', to: '/introduction/quickstart' },
            { label: 'SCORM 1.2 packaging', to: '/packaging/scorm12' },
            { label: 'Tracking', to: '/tracking/interface' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/manykarim/lernkit' },
            { label: 'Issues', href: 'https://github.com/manykarim/lernkit/issues' },
            { label: 'License (MIT)', href: 'https://github.com/manykarim/lernkit/blob/main/LICENSE' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} The Lernkit contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript', 'tsx', 'yaml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
