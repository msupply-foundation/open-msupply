/*
 * Shared helpers for the locale-catalog scripts (translate-locale,
 * translation-worklist, check-translations).
 *
 * The catalogs are flat `{ key: template }` JSON files under
 * `src/intl/locales/<code>/`, stored with a plain codepoint key sort. Plural
 * keys carry CLDR suffixes (`_one`, `_other`, …) and the set a locale needs
 * comes from `Intl.PluralRules` on the bare language of its `numberLocale` —
 * the same tag `src/intl/plural.ts` selects with at runtime.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export const localesRoot = './src/intl/locales';
export const localesModule = './src/intl/locales.ts';
export const manifestPath = './src/intl/ai-drafts.json';
export const guidesRoot = './src/intl/translation-guides';

// `{{token}}` interpolations and `$t(key)` nesting — both must survive
// translation verbatim.
export const placeholderRegex = /(\{\{[^{}]+\}\}|\$t\([^)]+\))/g;

const pluralSuffixRegex = /_(zero|one|two|few|many|other)$/;

export const splitPlural = key => {
  const match = key.match(pluralSuffixRegex);
  return match
    ? { base: key.slice(0, -match[0].length), category: match[1] }
    : undefined;
};

// Whitespace inside `{{ count }}` is insignificant to i18next-style
// interpolation, so tokens compare normalised.
export const placeholdersOf = text =>
  [...(text.match(placeholderRegex) ?? [])].map(token =>
    token.replace(/\s+/g, '')
  );

export const codepointCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Codepoint sort, matching the order the shipped catalogs are stored in.
export const sortKeys = value => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);

  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => codepointCompare(a, b))
      .map(([key, nestedValue]) => [key, sortKeys(nestedValue)])
  );
};

export const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw error;
  }
};

export const writeJson = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(sortKeys(value), null, 2)}\n`);
};

export const catalogPath = (locale, file = 'common.json') =>
  path.join(localesRoot, locale, file);

export const catalogFiles = async locale => {
  try {
    return (await fs.readdir(path.join(localesRoot, locale)))
      .filter(name => name.endsWith('.json'))
      .sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

/*
 * Read the registry out of `locales.ts` by regex rather than importing it —
 * these are plain node scripts with no TypeScript loader, and the file's shape
 * is stable (cf. check-min-browser.mjs). Returns the supported codes in order
 * and, per code, its `numberLocale` and overlay `base` (if any).
 */
export const readLocaleRegistry = async () => {
  const source = await fs.readFile(localesModule, 'utf8');

  const supported = source.match(/SUPPORTED_LOCALES = \[([\s\S]*?)\] as const/);
  const codes = supported
    ? [...supported[1].matchAll(/'([^']+)'/g)].map(match => match[1])
    : [];

  const metaBlock =
    source.match(/LOCALE_META[^=]*= \{([\s\S]*?)\n\};/)?.at(1) ?? '';
  const meta = {};
  for (const match of metaBlock.matchAll(
    /(?:'([^']+)'|([\w]+)): \{([^}]*)\}/g
  )) {
    const code = match[1] ?? match[2];
    const body = match[3];
    meta[code] = {
      numberLocale: body.match(/numberLocale: '([^']+)'/)?.at(1) ?? code,
      base: body.match(/base: '([^']+)'/)?.at(1),
    };
  }

  return { codes, meta };
};

export const isOverlay = (registry, locale) =>
  Boolean(registry.meta[locale]?.base);

// The CLDR categories a locale's catalog must provide for each plural key.
export const pluralCategories = (registry, locale) => {
  const tag =
    registry.meta[locale]?.numberLocale.split('-')[0] ?? locale.split('-')[0];
  return new Intl.PluralRules(tag).resolvedOptions().pluralCategories;
};

// A catalog as committed at `ref` (`{}` when the file didn't exist there).
export const readCatalogAt = (ref, locale, file = 'common.json') => {
  const repoPath = path
    .relative(
      execFileSync('git', ['rev-parse', '--show-toplevel'], {
        encoding: 'utf8',
      }).trim(),
      path.resolve(catalogPath(locale, file))
    )
    .split(path.sep)
    .join('/');
  try {
    return JSON.parse(
      execFileSync('git', ['show', `${ref}:${repoPath}`], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
    );
  } catch {
    return {};
  }
};

export const currentBranch = () =>
  execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

// Usage errors are the user's typo, not a crash — report and exit, no stack.
export const fail = message => {
  console.error(message);
  process.exit(1);
};

/*
 * The English text a translated key renders from: the key itself, or — for a
 * plural form English doesn't have (`_few`, `_many`, …) — the English
 * `_other`. Undefined when the key isn't in the English catalog at all.
 */
export const englishSourceFor = (en, key) => {
  if (Object.hasOwn(en, key)) return en[key];
  const plural = splitPlural(key);
  return plural ? en[`${plural.base}_other`] : undefined;
};

/*
 * A translation must carry exactly the English text's interpolations and
 * nesting references. The one allowance: a plural form may drop or add
 * `{{count}}` — French `_one` may read "Un article", and English `_one` is
 * often written "1 item" where another language interpolates the count.
 */
export const placeholderProblem = (english, translation, key) => {
  const expected = placeholdersOf(english);
  const actual = placeholdersOf(translation);
  const optional = splitPlural(key) ? ['{{count}}'] : [];
  const missing = expected.filter(
    token => !actual.includes(token) && !optional.includes(token)
  );
  const extra = actual.filter(
    token => !expected.includes(token) && !optional.includes(token)
  );
  if (!missing.length && !extra.length) return undefined;
  return [
    missing.length ? `missing ${missing.join(' ')}` : '',
    extra.length ? `unexpected ${extra.join(' ')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
};
