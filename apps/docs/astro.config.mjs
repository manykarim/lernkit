// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  integrations: [
    starlight({
      title: 'Lernkit',
      description: 'Code-first authoring for technical training.',
      social: {
        github: 'https://github.com/manykarim/lernkit',
      },
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Welcome', slug: 'index' },
            { label: 'Quickstart', slug: 'guides/quickstart' },
            { label: 'Build a SCORM 1.2 package', slug: 'guides/scorm12-package' },
          ],
        },
        {
          label: 'Sample course',
          items: [
            { label: 'Welcome to Lernkit', slug: 'course/welcome' },
            { label: 'Your first runnable cell', slug: 'course/hello-runnable' },
          ],
        },
        {
          label: 'Reference',
          items: [{ label: 'Architecture', slug: 'reference/architecture' }],
        },
      ],
      customCss: ['./src/styles/lernkit.css'],
    }),
  ],
});
