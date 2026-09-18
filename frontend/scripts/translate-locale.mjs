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
 * This is the "separate pass" CLAUDE.md's locale rule refers to — new keys
 * still go into `locales/en/` only, and machine output is a draft for the
 * translation team, never a substitute for it. Note it can't get plural
 * categories right either: the English catalog's `_one`/`_other` suffixes are
 * copied across as-is, and a language with different CLDR categories needs
 * those forms authored by hand.
 *
 * Usage: pnpm translate-locale <locale_code> [insert|update]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';

const root = './src/intl/locales';
const localesModule = './src/intl/locales.ts';
const [outputLocale, modeArg] = process.argv.slice(2);

// Usage errors are the user's typo, not a crash — report and exit, no stack.
const fail = message => {
  console.error(message);
  process.exit(1);
};

if (!outputLocale) {
  fail('Usage: pnpm translate-locale <locale_code> [insert|update]');
}

if (outputLocale === 'en') {
  fail('`en` is the source catalog — there is nothing to translate.');
}

const mode = modeArg ?? 'insert';
if (!['insert', 'update'].includes(mode)) {
  fail(`Invalid mode "${mode}". Use "insert" (default) or "update".`);
}
console.log(`Translating locale with mode "${mode}"...`);
const targetLanguage = outputLocale;
const sourceDir = path.join(root, 'en');
const outputDir = path.join(root, outputLocale);

const placeholderRegex = /(\{\{[^{}]+\}\}|\$t\([^)]+\))/g;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/*
 * Read the two facts the reminders need out of `locales.ts` by regex rather
 * than importing it — this is a plain node script with no TypeScript loader,
 * and the file's shape is stable (cf. scripts/check-min-browser.mjs, which
 * reads its declarations the same way).
 */
const readLocaleRegistry = async () => {
  let source;
  try {
    source = await fs.readFile(localesModule, 'utf8');
  } catch {
    return { registered: true, base: undefined };
  }

  const supported = source.match(/SUPPORTED_LOCALES = \[([\s\S]*?)\] as const/);
  const codes = supported
    ? [...supported[1].matchAll(/'([^']+)'/g)].map(match => match[1])
    : [];

  const meta = source.match(/LOCALE_META[^=]*= \{([\s\S]*?)\n\};/);
  const entry = meta
    ?.at(1)
    ?.match(new RegExp(`'?${outputLocale}'?: \\{[^}]*base: '([^']+)'`));

  return {
    registered: codes.length === 0 || codes.includes(outputLocale),
    base: entry?.[1],
  };
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

// Codepoint sort, matching the order the shipped catalogs are stored in.
const sortKeys = value => {
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, nestedValue]) => [key, sortKeys(nestedValue)])
  );
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

const main = async () => {
  const { registered, base } = await readLocaleRegistry();
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
