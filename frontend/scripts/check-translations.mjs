/*
 * Guard for AI-drafted translations — the `translate` skill's last step, and
 * safe to run on any branch. Compares every catalog against <ref> (default:
 * the merge-base with origin/develop) and fails if this branch:
 *   - changed or removed an existing translation in a non-English catalog
 *     (existing wording is the translation team's). Two exceptions: filling
 *     an existing empty value counts as adding, and an AI draft that
 *     `ai-drafts.json` listed at <ref> — still awaiting review — may be
 *     revised (the listing at <ref>, so adding a human translation's key to
 *     the list on this branch doesn't unlock it)
 *   - touched an overlay catalog at all (a locale with a `base`, e.g. fr-DJ)
 *   - added a translation whose `{{tokens}}` / `$t()` references differ from
 *     the English (a plural form may drop or add `{{count}}`)
 *   - added a plural key the locale doesn't use, or left an added plural
 *     without every CLDR category the locale needs
 *   - left a catalog out of codepoint key order
 *   - has an `ai-drafts.json` entry for a key the catalog doesn't contain
 *
 * Usage: node scripts/check-translations.mjs [--base <ref>]
 */
import { execFileSync } from 'node:child_process';
import {
  catalogFiles,
  codepointCompare,
  englishSourceFor,
  fail,
  isOverlay,
  manifestPath,
  placeholderProblem,
  pluralCategories,
  readCatalogAt,
  readJson,
  readLocaleRegistry,
  catalogPath,
  splitPlural,
} from './lib/locale-catalog.mjs';

const args = process.argv.slice(2);
const baseIndex = args.indexOf('--base');
let base = baseIndex === -1 ? undefined : args[baseIndex + 1];
if (baseIndex !== -1 && !base) fail('--base needs a git ref.');
if (!base) {
  try {
    base = execFileSync('git', ['merge-base', 'HEAD', 'origin/develop'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    fail('Could not find a merge-base with origin/develop; pass --base <ref>.');
  }
}

const registry = await readLocaleRegistry();
const errors = [];
const notes = [];

const en = {};
for (const file of await catalogFiles('en')) {
  Object.assign(en, await readJson(catalogPath('en', file)));
}

const manifest = await readJson(manifestPath, {});
// The drafts awaiting review at <ref>: the only existing values a branch may
// revise. Read at the base, never from the working tree.
let draftsAtBase = {};
try {
  draftsAtBase = JSON.parse(
    execFileSync(
      'git',
      ['show', `${base}:./${manifestPath.replace(/^\.\//, '')}`],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    )
  );
} catch {
  // No manifest at the base: nothing is revisable.
}

for (const locale of registry.codes) {
  if (locale === 'en') continue;
  const overlay = isOverlay(registry, locale);
  const categories = pluralCategories(registry, locale);
  const merged = {};
  const added = [];

  for (const file of await catalogFiles(locale)) {
    const label = `${locale}/${file}`;
    const now = await readJson(catalogPath(locale, file));
    const before = readCatalogAt(base, locale, file);
    Object.assign(merged, now);

    const keys = Object.keys(now);
    if (
      keys.some(
        (key, index) => index && codepointCompare(keys[index - 1], key) > 0
      )
    ) {
      errors.push(`${label}: keys are not in codepoint order`);
    }

    for (const [key, value] of Object.entries(before)) {
      if (!Object.hasOwn(now, key)) {
        errors.push(`${label}: removed existing key ${key}`);
      } else if (
        now[key] !== value &&
        value !== '' &&
        !Object.hasOwn(draftsAtBase[locale] ?? {}, key)
      ) {
        // Filling an empty value is an addition — it renders blank otherwise;
        // an unreviewed AI draft may be revised.
        errors.push(`${label}: changed existing translation of ${key}`);
      }
    }

    const newKeys = keys.filter(key => !Object.hasOwn(before, key));
    if (overlay && newKeys.length) {
      errors.push(
        `${label}: overlay catalog gained ${newKeys.length} key(s) — overlays are maintained by hand, never drafted`
      );
      continue;
    }
    for (const key of newKeys) added.push({ key, value: now[key], label });
  }

  const pluralBases = new Set();
  for (const { key, value, label } of added) {
    const english = englishSourceFor(en, key);
    if (english === undefined) {
      notes.push(`${label}: ${key} has no English source`);
      continue;
    }
    const problem = placeholderProblem(english, value, key);
    if (problem) errors.push(`${label}: ${key} placeholders ${problem}`);

    const plural = splitPlural(key);
    if (plural) {
      if (!categories.includes(plural.category)) {
        errors.push(
          `${label}: ${key} — "${plural.category}" isn't a ${locale} plural category (${categories.join(', ')})`
        );
      }
      pluralBases.add(plural.base);
    }
  }
  for (const pluralBase of pluralBases) {
    const missing = categories.filter(
      category => !Object.hasOwn(merged, `${pluralBase}_${category}`)
    );
    if (missing.length) {
      errors.push(
        `${locale}: ${pluralBase} is missing plural form(s) ${missing.join(', ')}`
      );
    }
  }

  const drafted = manifest[locale] ?? {};
  for (const key of Object.keys(drafted)) {
    if (!Object.hasOwn(merged, key)) {
      errors.push(`${manifestPath}: ${locale}/${key} isn't in the catalog`);
    }
  }
  const undrafted = added.filter(({ key }) => !Object.hasOwn(drafted, key));
  if (undrafted.length) {
    notes.push(
      `${locale}: ${undrafted.length} added key(s) aren't in ${manifestPath} (fine for human translations)`
    );
  }
  if (added.length) notes.push(`${locale}: ${added.length} key(s) added`);
}

for (const note of notes) console.log(`  ${note}`);
if (errors.length) {
  console.error(
    `\ncheck-translations: ${errors.length} problem(s) against ${base.slice(0, 10)}:\n  ${errors.join('\n  ')}`
  );
  process.exit(1);
}
console.log(`check-translations: ok against ${base.slice(0, 10)}`);
