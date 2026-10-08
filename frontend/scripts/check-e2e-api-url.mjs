/*
 * e2e server-address check (e2e/AUTHORING.md § The server address).
 *
 * A Playwright project may point at its own server, so the API origin is
 * per project: `apiUrl()` in e2e/helpers/api.ts resolves it from the running
 * test's project, and playwright.config.ts is where the environment feeds
 * it. Anything else reading API_URL / BASE_URL from `process.env` pins a
 * call to one server and silently breaks once projects stop sharing one.
 * This script fails on any such read under e2e/ outside those two files.
 * Exit code 1 with a report on failure. Run via `npm run check`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'e2e';
const ALLOWED = new Set(['e2e/helpers/api.ts', 'e2e/playwright.config.ts']);
const READ =
  /process\.env(?:\.(?:API_URL|BASE_URL)\b|\[\s*['"](?:API_URL|BASE_URL)['"]\s*\])/;

const files = [];
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) files.push(path);
  }
};
walk(ROOT);

const offences = [];
for (const file of files) {
  const rel = relative('.', file).split('\\').join('/');
  if (ALLOWED.has(rel)) continue;
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (READ.test(line)) offences.push(`  ${rel}:${i + 1}  ${line.trim()}`);
    });
}

if (offences.length) {
  console.error(
    `e2e reads the server address from process.env — use apiUrl() from e2e/helpers/api.ts:\n${offences.join('\n')}`
  );
  process.exit(1);
}

console.log(
  `e2e server address OK — ${files.length} file(s), only apiUrl() and the config read it`
);
