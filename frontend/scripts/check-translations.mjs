/*
 * Guard for AI-drafted translations — the `translate` skill's last step, and
 * safe to run on any branch. Compares every catalog against <ref> (default:
 * the merge-base with origin/develop) and fails if this branch:
 *   - changed an existing translation in a non-English catalog (existing
 *     wording is the translation team's). Filling an existing empty value
 *     counts as adding. With --update — a terminology or glossary change the
 *     developer asked for — changes are listed instead of failing
 *   - removed an existing key, or deleted a catalog file that had keys
 *   - touched an overlay catalog at all (a locale with a `base`, e.g. fr-DJ)
 *   - added or changed a translation whose `{{tokens}}` / `$t()` references
 *     differ from the English (a plural form may drop or add `{{count}}`)
 *   - added a plural key the locale doesn't use, or left an added plural
 *     without every CLDR category the locale needs
 *   - left a catalog out of codepoint key order
 *
 * It compares a branch against its base, so it isn't a CI check: Weblate's
 * own commits change existing translations, which is what it refuses.
 *
 * Usage: node scripts/check-translations.mjs [--base <ref>] [--update]
 */
import {
  catalogFiles,
  codepointCompare,
  englishSourceFor,
  fail,
  isOverlay,
  placeholderProblem,
  pluralCategories,
  readCatalogAt,
  readJson,
  readLocaleRegistry,
  resolveBase,
  catalogPath,
  splitPlural,
} from './lib/locale-catalog.mjs';

const args = process.argv.slice(2);
const baseIndex = args.indexOf('--base');
const baseArg = baseIndex === -1 ? undefined : args[baseIndex + 1];
if (baseIndex !== -1 && (!baseArg || baseArg.startsWith('--'))) {
  fail('--base needs a git ref.');
}
const base = resolveBase(baseArg);
const update = args.includes('--update');

const registry = await readLocaleRegistry();
const errors = [];
const notes = [];

const en = {};
for (const file of await catalogFiles('en')) {
  Object.assign(en, await readJson(catalogPath('en', file)));
}

for (const locale of registry.codes) {
  if (locale === 'en') continue;
  const overlay = isOverlay(registry, locale);
  const categories = pluralCategories(registry, locale);
  const merged = {};
  const added = [];
  const changed = [];

  const files = await catalogFiles(locale);
  // A catalog file deleted on this branch is never in `files`; catch it here.
  for (const file of await catalogFiles('en')) {
    if (files.includes(file)) continue;
    const gone = Object.keys(readCatalogAt(base, locale, file)).length;
    if (gone) errors.push(`${locale}/${file}: deleted, with ${gone} key(s)`);
  }

  for (const file of files) {
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
      } else if (now[key] !== value) {
        if (overlay) {
          errors.push(`${label}: overlay catalog changed ${key}`);
        } else if (value === '') {
          // Filling an empty value is an addition — it renders blank otherwise.
          added.push({ key, value: now[key], label });
        } else {
          changed.push({ key, value: now[key], label });
          if (!update) {
            errors.push(
              `${label}: changed existing translation of ${key} (allowed only with --update, for a terminology change the developer asked for)`
            );
          }
        }
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
  for (const { key, value, label } of [...added, ...changed]) {
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

  if (added.length) notes.push(`${locale}: ${added.length} key(s) added`);
  if (update && changed.length) {
    notes.push(
      `${locale}: ${changed.length} existing translation(s) changed (--update): ${changed.map(({ key }) => key).join(', ')}`
    );
  }
}

for (const note of notes) console.log(`  ${note}`);
if (errors.length) {
  console.error(
    `\ncheck-translations: ${errors.length} problem(s) against ${base.slice(0, 10)}:\n  ${errors.join('\n  ')}`
  );
  process.exit(1);
}
console.log(`check-translations: ok against ${base.slice(0, 10)}`);
