/*
 * Emit every form plugin's JSON Schemas from their TypeScript types, and the
 * host's schemas of the SDK's base document types — or, with `--check`, fail
 * when a committed schema no longer matches its type.
 *
 * A form plugin is a plugin directory with a `forms/forms.json`
 * declaration; the layout, the frozen-version rule and the generator setup
 * are in vite/formPlugins.ts. This script walks the same directories
 * build-plugins.mjs does (scripts/pluginDirs.mjs), and build-plugins.mjs
 * runs the same emit itself before packing, so a bundle never carries a
 * schema older than its type.
 *
 * It also writes each type's `versions.ts` (the schema version ids, as the
 * bundle packs them), and in both modes runs the versioning checks
 * build-plugins.mjs runs before packing: archived types still generating
 * their frozen files, event-rule paths, migrations and fixtures.
 *
 * `--check` writes nothing and exits non-zero naming each file that is
 * stale or missing, and each versioning problem. It is part of `pnpm check`:
 * without it, a type change whose schema was not re-emitted and committed
 * would pass review, and the committed schema is what gets packed and
 * installed.
 *
 * Usage: pnpm forms:emit    [OMS_PLUGIN_DIRS=../some-plugin-checkout]
 *        pnpm forms:check
 */
import {
  emitBaseSchemas,
  emitFormSchemas,
  readFormsDeclaration,
  readPluginCode,
} from '../vite/formPlugins.ts';
import { checkFormVersions } from '../vite/formVersionChecks.ts';
import { envPluginDirs, inRepoPluginDirs } from './pluginDirs.mjs';

const check = process.argv.includes('--check');
const problems = [];
let plugins = 0;
let files = 0;

for (const dir of [...inRepoPluginDirs(), ...envPluginDirs()]) {
  let declaration;
  let pluginCode;
  try {
    declaration = readFormsDeclaration(dir);
    if (declaration) pluginCode = readPluginCode(dir);
  } catch (error) {
    problems.push(error.message);
    continue;
  }
  if (!declaration) continue;
  plugins += 1;
  const result = await emitFormSchemas(dir, declaration, { check, pluginCode });
  for (const file of result.written) console.info(`[forms] wrote ${file}`);
  files += result.written.length + result.unchanged.length;
  problems.push(...result.problems);
  // The versioning checks build-plugins.mjs runs before packing, here too
  // for early feedback (vite/formVersionChecks.ts).
  problems.push(...(await checkFormVersions(dir, declaration)));
}

// The host's copies of the base document types' schemas, which it validates
// every draft against beside the registry entry's own (vite/formPlugins.ts).
const base = await emitBaseSchemas({ check });
for (const file of base.written) console.info(`[forms] wrote ${file}`);
files += base.written.length + base.unchanged.length;
problems.push(...base.problems);

if (problems.length > 0) {
  console.error(
    `[forms] ${check ? 'check failed' : 'emit failed'}:\n  - ` +
      problems.join('\n  - ')
  );
  process.exit(1);
}
console.info(
  `[forms] ${check ? 'checked' : 'emitted'} ${files} file(s) ` +
    `across ${plugins} form plugin(s)` +
    (check ? '; all match their types' : '') +
    '; versioning checks passed'
);
