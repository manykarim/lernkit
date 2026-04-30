#!/usr/bin/env node
/**
 * Mirror docs/adr/*.md from the repo root into apps/website/docs/architecture/adrs/.
 * Single source of truth: the ADRs in their canonical location stay authoritative;
 * this script regenerates the Docusaurus copies on every build.
 *
 * Runs as a pre-build / pre-dev step (see apps/website/package.json scripts) so
 * the files exist before Docusaurus's plugin-content-docs scans the docs/ tree.
 *
 * MDX-3 escaping: the ADRs contain prose like `<150ms` and `<3 hops` that MDX 3
 * misreads as JSX tag starts. We escape `<` followed by a digit, whitespace, or
 * end-of-line — outside fenced code blocks — so prose renders cleanly without
 * touching real code samples.
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(here, '..');
const sourceDir = resolve(websiteRoot, '../../docs/adr');
const targetDir = resolve(websiteRoot, 'docs/architecture/adrs');

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

async function main() {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md')
    .map((e) => e.name)
    .sort();

  await mkdir(targetDir, { recursive: true });

  const indexEntries = [];
  for (const filename of mdFiles) {
    const sourcePath = join(sourceDir, filename);
    const raw = await readFile(sourcePath, 'utf8');
    const adr = parseAdr(filename, raw);
    if (!adr) continue;

    const dest = join(targetDir, `${adr.id}.md`);
    const frontmatter = [
      '---',
      `id: ${adr.id}`,
      `title: ${escapeYaml(adr.title)}`,
      `slug: /architecture/adrs/${adr.id}`,
      `sidebar_label: ${escapeYaml(adr.title.replace(/^ADR-?\d+[:.]?\s*/i, ''))}`,
      `description: ${escapeYaml(adr.title)}`,
      '---',
      '',
      `> Source: [\`docs/adr/${adr.slug}\`](https://github.com/manykarim/lernkit/blob/main/docs/adr/${adr.slug})`,
      '',
    ].join('\n');
    await writeFile(dest, frontmatter + escapeMdxAmbiguities(adr.body), 'utf8');
    indexEntries.push(`- [${adr.title}](/architecture/adrs/${adr.id})`);
  }

  const indexBody = [
    '---',
    'id: index',
    'title: Architecture decisions',
    'slug: /architecture/adrs',
    'sidebar_label: All ADRs',
    '---',
    '',
    '# Architecture decisions',
    '',
    'Lernkit captures non-obvious design decisions as Markdown ADRs (Architecture',
    'Decision Records) following the [MADR](https://adr.github.io/madr/) format. The',
    'records below mirror `docs/adr/` from the repo root; that directory is the',
    'source of truth.',
    '',
    ...indexEntries,
    '',
  ].join('\n');
  await writeFile(join(targetDir, 'index.md'), indexBody, 'utf8');

  console.log(`[sync-adrs] wrote ${mdFiles.length} ADRs + index to ${targetDir}`);
}

function parseAdr(filename, raw) {
  const id = filename.replace(/\.md$/, '');
  let body = raw;
  let frontmatterTitle;

  const match = FRONTMATTER_RE.exec(raw);
  if (match) {
    const [, fmRaw, rest] = match;
    body = rest ?? '';
    if (fmRaw) {
      for (const line of fmRaw.split('\n')) {
        const m = /^(\w+):\s*(.+)$/.exec(line.trim());
        if (!m) continue;
        const [, key, value] = m;
        if (!key || !value) continue;
        const v = value.replace(/^["']|["']$/g, '');
        if (key === 'title') frontmatterTitle = v;
      }
    }
  }

  let title = frontmatterTitle;
  if (!title) {
    const headingMatch = /^#\s+(.+)$/m.exec(body);
    if (headingMatch?.[1]) title = headingMatch[1].trim();
  }
  if (!title) title = id;

  return { id, slug: filename, title, body };
}

function escapeMdxAmbiguities(input) {
  const lines = input.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    if (/^```/.test(raw.trimStart())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    lines[i] = raw.replace(/<(?=[\d\s]|$)/g, '&lt;');
  }
  return lines.join('\n');
}

function escapeYaml(value) {
  if (/^[\w\s\-:.,!?()'"&]+$/.test(value)) {
    return value.includes(':') ? `"${value.replace(/"/g, '\\"')}"` : value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}

main().catch((e) => {
  console.error('[sync-adrs] failed:', e);
  process.exit(1);
});
