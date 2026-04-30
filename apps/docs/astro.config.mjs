// @ts-check
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  integrations: [
    react(),
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
            { label: 'Quiz demo', slug: 'course/quiz-demo' },
          ],
        },
        {
          label: 'Robot Framework training',
          items: [
            { label: 'Course overview', slug: 'rf-training' },
            { label: 'Cheat sheet', slug: 'rf-training/cheat-sheet' },
            {
              label: 'Section 1 — Getting started',
              collapsed: false,
              items: [
                { label: 'Section 1 intro', slug: 'rf-training/section-1-getting-started' },
                { label: '1.1 Install Python', slug: 'rf-training/section-1-getting-started/1-1-install-python' },
                { label: '1.2 Virtual environments', slug: 'rf-training/section-1-getting-started/1-2-virtual-environments' },
                { label: '1.3 (Optional) uv', slug: 'rf-training/section-1-getting-started/1-3-uv' },
                { label: '1.4 Installing Robot Framework', slug: 'rf-training/section-1-getting-started/1-4-installing-rf' },
                { label: '1.5 IDE setup', slug: 'rf-training/section-1-getting-started/1-5-ide-setup' },
                { label: 'Section 1 review', slug: 'rf-training/section-1-getting-started/review' },
              ],
            },
            {
              label: 'Section 2 — Fundamentals',
              collapsed: false,
              items: [
                { label: 'Section 2 intro', slug: 'rf-training/section-2-fundamentals' },
                { label: '2.1 Anatomy of a .robot file', slug: 'rf-training/section-2-fundamentals/2-1-anatomy' },
                { label: '2.2 Writing test cases', slug: 'rf-training/section-2-fundamentals/2-2-writing-tests' },
                { label: '2.3 Variables', slug: 'rf-training/section-2-fundamentals/2-3-variables' },
                { label: '2.4 Basic assertions', slug: 'rf-training/section-2-fundamentals/2-4-assertions' },
                { label: '2.5 Control structures', slug: 'rf-training/section-2-fundamentals/2-5-control-structures' },
                { label: 'Hands-on exercises', slug: 'rf-training/section-2-fundamentals/exercises' },
                { label: 'Section 2 review', slug: 'rf-training/section-2-fundamentals/review' },
              ],
            },
          ],
        },
        {
          label: 'Reference',
          items: [{ label: 'Architecture', slug: 'reference/architecture' }],
        },
      ],
      customCss: ['./src/styles/lernkit.css'],
      components: {
        Head: './src/components/CustomHead.astro',
      },
    }),
  ],
});
