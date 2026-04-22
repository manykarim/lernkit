// Copies non-TS assets (Nunjucks templates, SCORM schema files) into dist/
// during the build. Keeps the published package self-contained so consumers
// don't have to reach into src/.

import { cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, '..');

const assetGroups = [
  { from: 'src/scorm12/templates', to: 'dist/scorm12/templates', required: true },
  { from: 'src/scorm12/assets', to: 'dist/scorm12/assets', required: true },
  { from: 'src/scorm12/schemas', to: 'dist/scorm12/schemas', required: false },
];

for (const g of assetGroups) {
  try {
    await cp(join(packageRoot, g.from), join(packageRoot, g.to), { recursive: true });
  } catch (e) {
    if (e.code === 'ENOENT' && !g.required) continue;
    throw e;
  }
}

console.log('Copied packager assets to dist/');
