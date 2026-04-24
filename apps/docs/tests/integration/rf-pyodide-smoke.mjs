/**
 * Node-side smoke test for browser-bound Pyodide-RF — run manually or via CI.
 *
 * Boots Pyodide in Node, installs robotframework from the **local wheel**
 * (vendored at `apps/docs/public/pyodide/wheels/`, ADR 0021), writes a small
 * suite to the Pyodide virtual FS, runs `robot.run()`, and verifies the
 * artifacts (log.html, report.html, output.xml) appear. Exits 0 on success.
 *
 * This is the Lernkit port of `rf-cert-platform/scripts/pyodide-test/validate-rf.mjs`
 * from 2026-04-24, adapted to:
 *   - install RF from our self-hosted wheel (no PyPI at runtime)
 *   - run in Node (Playwright-based browser test comes in the next slice)
 *   - print timings so we have directional numbers for the cold-install budget
 *
 * Run:
 *   node apps/docs/tests/integration/rf-pyodide-smoke.mjs
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..', '..');
const wheelsDir = join(appRoot, 'public', 'pyodide', 'wheels');

const require = createRequire(import.meta.url);

async function main() {
  const t0 = Date.now();
  console.log('[rf-smoke] booting Pyodide…');
  const { loadPyodide } = await import('pyodide');
  const pyodide = await loadPyodide();
  console.log(`[rf-smoke]   +${Date.now() - t0} ms — Pyodide ready`);

  const t1 = Date.now();
  console.log('[rf-smoke] loading local robotframework wheel into Pyodide FS…');
  const wheelName = 'robotframework-7.4.2-py3-none-any.whl';
  const wheelBytes = await readFile(join(wheelsDir, wheelName));
  // Mount the wheel at an in-Pyodide path micropip can install from.
  pyodide.FS.writeFile(`/${wheelName}`, new Uint8Array(wheelBytes));
  console.log(`[rf-smoke]   +${Date.now() - t1} ms — wheel on virtual FS`);

  const t2 = Date.now();
  console.log('[rf-smoke] installing robotframework via micropip (from local emfs://)…');
  await pyodide.loadPackage('micropip');
  await pyodide.runPythonAsync(`
import micropip
# The 'emfs:' scheme tells micropip to install from the Pyodide virtual FS.
await micropip.install('emfs:/${wheelName}', deps=False)
import robot
print(f'robot.__version__ = {robot.__version__}')
  `);
  console.log(`[rf-smoke]   +${Date.now() - t2} ms — robotframework installed`);

  const t3 = Date.now();
  console.log('[rf-smoke] running a tiny suite…');
  const rc = await pyodide.runPythonAsync(`
import os, robot
os.makedirs('/work', exist_ok=True)
os.chdir('/work')
with open('smoke.robot', 'w') as f:
    f.write("""*** Settings ***
Documentation    Lernkit RF-Pyodide smoke test

*** Variables ***
\${GREETING}    Hello from Lernkit

*** Test Cases ***
Say Hello
    Log    \${GREETING}
    Should Be Equal    \${GREETING}    Hello from Lernkit

Sum Works
    \${result}=    Evaluate    1 + 2
    Should Be Equal As Integers    \${result}    3
""")
rc = robot.run('.', outputdir='/work/results', consolecolors='off', loglevel='INFO')
rc
  `);
  console.log(`[rf-smoke]   +${Date.now() - t3} ms — robot.run() returned rc=${rc}`);

  if (rc !== 0) {
    console.error('[rf-smoke] FAIL — rc !== 0');
    process.exit(1);
  }

  const artifacts = pyodide.FS.readdir('/work/results');
  const wanted = ['log.html', 'report.html', 'output.xml'];
  const missing = wanted.filter((w) => !artifacts.includes(w));
  if (missing.length > 0) {
    console.error(`[rf-smoke] FAIL — missing artifacts: ${missing.join(', ')}`);
    process.exit(1);
  }
  const sizes = wanted.map((w) => {
    const body = pyodide.FS.readFile(`/work/results/${w}`);
    return `${w}=${(body.length / 1024).toFixed(1)} KB`;
  });

  const total = Date.now() - t0;
  console.log('[rf-smoke] PASS');
  console.log(`[rf-smoke]   total: ${total} ms`);
  console.log(`[rf-smoke]   artifacts: ${sizes.join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
