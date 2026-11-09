/*
 * Draft-translate the English catalogs into another locale.
 *
 * Ported from open-msupply's `client/translate_locale.js`; same behaviour,
 * adapted to this repo:
 *   - ESM (`"type": "module"`) and `src/intl/locales` as the catalog root
 *   - output keys sorted with a plain codepoint sort, which is the order the
 *     shipped catalogs are already in (`localeCompare`, as the original used,
 *     would reshuffle every existing file into one enormous diff)
 *   - a warning when the target is a regional overlay (a locale with a `base`
 *     in `LOCALE_META`, e.g. `fr-DJ`): those catalogs are deliberately thin —
 *     every key they don't restate resolves through the base — so filling one
 *     wholesale defeats the fallback
 *   - a closing reminder that a brand-new catalog also needs registering in
 *     `src/intl/locales.ts` (`SUPPORTED_LOCALES` + `LOCALE_META`), which
 *     `locales.test.ts` enforces
 *
 * Every English `*.json` under `locales/en/` is walked; each is translated
 * through the public Google Translate endpoint into `locales/<code>/`, with
 * `{{tokens}}` and `$t(...)` references masked out so they survive the round
 * trip. Two modes: `insert` (default) only fills keys the target catalog is
 * missing; `update` re-translates everything.
 *
 * Day-to-day translation of new keys is the `translate` skill
 * (`.claude/skills/translate/`), which drafts with usage context and the
 * catalog's existing terminology. This script's raw output is literal and
 * context-free, so writing it into a catalog is for bootstrapping a brand-new
 * language only. It can't get plural categories right either: the English
 * catalog's `_one`/`_other` suffixes are copied across as-is, and a language
 * with different CLDR categories needs those forms authored by hand.
 *
 * `--candidates <file>` is the skill's mode: it translates the keys the target
 * is missing (or those listed in `--keys <file>`, a JSON array) and writes
 * `{ key: googleText }` to <file> — no prompt, and the catalog is never
 * touched. The skill uses it as a second opinion for low-resource languages.
 *
 * Usage: pnpm translate-locale <locale_code> [insert|update]
 *        pnpm translate-locale <locale_code> --candidates <out.json>
 *          [--keys <keys.json>]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import {
  fail,
  localesModule,
  localesRoot as root,
  placeholderRegex,
  readJson,
  readLocaleRegistry,
  sortKeys,
  writeJson,
} from './lib/locale-catalog.mjs';

const args = process.argv.slice(2);
const takeFlag = name => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const [, value] = args.splice(index, 2);
  if (!value) fail(`${name} needs a file path.`);
  return value;
};
const candidatesFile = takeFlag('--candidates');
const keysFile = takeFlag('--keys');
const [outputLocale, modeArg] = args;

if (!outputLocale) {
  fail(
    'Usage: pnpm translate-locale <locale_code> [insert|update]\n' +
      '       pnpm translate-locale <locale_code> --candidates <out.json> [--keys <keys.json>]'
  );
}

if (outputLocale === 'en') {
  fail('`en` is the source catalog — there is nothing to translate.');
}

const mode = modeArg ?? 'insert';
if (!['insert', 'update'].includes(mode)) {
  fail(`Invalid mode "${mode}". Use "insert" (default) or "update".`);
}
if (keysFile && !candidatesFile) {
  fail('--keys only applies with --candidates.');
}
if (!candidatesFile) console.log(`Translating locale with mode "${mode}"...`);
// Google's code where it differs from ours: it rejects `prs` and serves
// Dari as Afghan Persian.
const googleCodes = { prs: 'fa-AF' };
const targetLanguage = googleCodes[outputLocale] ?? outputLocale;
const sourceDir = path.join(root, 'en');
const outputDir = path.join(root, outputLocale);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const readRegistryFacts = async () => {
  try {
    const { codes, meta } = await readLocaleRegistry();
    return {
      registered: codes.length === 0 || codes.includes(outputLocale),
      base: meta[outputLocale]?.base,
    };
  } catch {
    return { registered: true, base: undefined };
  }
};

const confirmProceed = async overlayBase => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'Interactive confirmation requires a TTY terminal. Please run this script in an interactive shell.'
    );
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const overlayWarning = overlayBase
    ? [
        '',
        `NOTE: "${outputLocale}" is an overlay on "${overlayBase}" — it is meant to hold`,
        `only the keys that differ from ${overlayBase}, and everything else falls back to it.`,
        'Filling it wholesale defeats that fallback.',
      ]
    : [];

  const warning = [
    '',
    '*********************************** WARNING! ***********************************',
    'This should only be used to create a draft translation for a new language',
    'or to temporarily fill in some gaps until translations can be properly reviewed.',
    'It is NOT intended for updating existing translations, if the target text ',
    'has changed since translation this should be handled by the translation team.',
    '********************************************************************************',
    ...overlayWarning,
    '',
    'Type "ok" to continue: ',
  ].join('\n');

  const answer = await rl.question(warning);
  rl.close();

  if (answer.trim().toLowerCase() !== 'ok') {
    console.log('Aborted by user. No files were changed.');
    process.exit(0);
  }
};

const maskPlaceholders = text => {
  const tokens = [];
  const masked = text.replace(placeholderRegex, match => {
    const token = `__PH_${tokens.length}__`;
    tokens.push(match);
    return token;
  });
  return { masked, tokens };
};

const unmaskPlaceholders = (text, tokens) => {
  let output = text;
  for (let index = 0; index < tokens.length; index += 1) {
    output = output.replaceAll(`__PH_${index}__`, tokens[index]);
  }
  return output;
};

const cache = new Map();

const listJsonFiles = async directory => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
};

const translateText = async text => {
  if (cache.has(text)) return cache.get(text);
  if (!text) {
    cache.set(text, text);
    return text;
  }

  const { masked, tokens } = maskPlaceholders(text);
  if (!masked.trim()) {
    cache.set(text, text);
    return text;
  }

  let translated = text;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(masked)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      translated = body?.[0]?.map(part => part?.[0] ?? '').join('') || text;
      translated = unmaskPlaceholders(translated, tokens);
      break;
    } catch {
      if (attempt === 3) translated = text;
      await sleep((attempt + 1) * 600);
    }
  }

  cache.set(text, translated);
  return translated;
};

// Google's suggestions for the keys the target lacks, written to a scratch
// file for the translate skill to weigh — the catalog is left untouched.
const writeCandidates = async () => {
  const wanted = keysFile ? new Set(await readJson(keysFile)) : undefined;
  const candidates = {};

  for (const sourcePath of await listJsonFiles(sourceDir)) {
    const relativePath = path.relative(sourceDir, sourcePath);
    const source = await readJson(sourcePath);
    const destination = await readJson(path.join(outputDir, relativePath), {});

    for (const [key, value] of Object.entries(source)) {
      const include = wanted
        ? wanted.has(key)
        : !Object.hasOwn(destination, key);
      if (!include || typeof value !== 'string') continue;
      const translated = await translateText(value);
      // A failed call echoes the English back; that's no candidate at all.
      if (translated !== value) candidates[key] = translated;
      await sleep(40);
    }
  }

  await writeJson(candidatesFile, candidates);
  console.log(
    `wrote ${Object.keys(candidates).length} candidates to ${candidatesFile} (sl=en, tl=${targetLanguage})`
  );
};

const main = async () => {
  if (candidatesFile) return writeCandidates();

  const { registered, base } = await readRegistryFacts();
  await confirmProceed(base);

  const sourceJsonFiles = await listJsonFiles(sourceDir);
  let totalChangedCount = 0;
  let filesProcessed = 0;

  for (const sourcePath of sourceJsonFiles) {
    console.log(`processing file: ${path.relative(sourceDir, sourcePath)}...`);
    const relativePath = path.relative(sourceDir, sourcePath);
    const outputPath = path.join(outputDir, relativePath);

    const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    let destination = {};

    try {
      destination = JSON.parse(await fs.readFile(outputPath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        destination = {};
      } else {
        throw error;
      }
    }

    const output = { ...destination };
    const entries = Object.entries(source);
    let changedCount = 0;

    for (let index = 0; index < entries.length; index += 1) {
      const [key, value] = entries[index];

      const existsInDestination = Object.hasOwn(output, key);
      // In "insert" mode, only translate keys the destination lacks.
      const shouldTranslate = mode === 'update' || !existsInDestination;

      if (shouldTranslate) {
        const translatedValue =
          typeof value === 'string' ? await translateText(value) : value;

        if (translatedValue !== output[key]) {
          changedCount += 1;
          totalChangedCount += 1;
        }
        output[key] = translatedValue;
      }

      if ((index + 1) % 250 === 0) {
        console.log(
          `translated ${relativePath}: ${index + 1}/${entries.length}`
        );
      }
      await sleep(40);
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const sortedOutput = sortKeys(output);
    await fs.writeFile(
      outputPath,
      `${JSON.stringify(sortedOutput, null, 2)}\n`,
      'utf8'
    );
    filesProcessed += 1;
    console.log(
      `done file: ${relativePath} (${changedCount} keys ${mode === 'insert' ? 'inserted' : 'updated'})`
    );
  }

  console.log(
    `done: ${totalChangedCount} keys ${mode === 'insert' ? 'inserted' : 'updated'} across ${filesProcessed}/${sourceJsonFiles.length} files in ${outputDir} (sl=en, tl=${targetLanguage}, mode=${mode})`
  );

  if (!registered) {
    console.log(
      [
        '',
        `"${outputLocale}" is not in SUPPORTED_LOCALES yet, so the app won't offer it and`,
        '`pnpm test` will fail on locales.test.ts ("offers every shipped catalog").',
        `Add it to SUPPORTED_LOCALES and LOCALE_META in ${localesModule} —`,
        'LOCALE_META needs a text direction and a number locale Intl accepts.',
      ].join('\n')
    );
  }
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
