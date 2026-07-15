import { LOCALE_META, type SupportedLocale } from './locales';

// CLDR plural category for a count in a locale, via the platform Intl.PluralRules
// (no dependency, correct for every supported language). Catalog keys use these
// as suffixes: `key_one`, `key_other`, `key_few`, … — matching i18next's v4
// convention, so existing catalogs stay compatible.
const cache = new Map<string, Intl.PluralRules>();

export const pluralCategory = (
  locale: SupportedLocale,
  count: number
): Intl.LDMLPluralRule => {
  // Use the number locale (bare language part) so plural rules match the
  // language, not any numbering-system tag.
  const tag = LOCALE_META[locale].numberLocale.split('-')[0] ?? locale;
  let rules = cache.get(tag);
  if (!rules) {
    rules = new Intl.PluralRules(tag);
    cache.set(tag, rules);
  }
  return rules.select(count);
};
