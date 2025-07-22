import { LocaleKey, TypedTFunction } from '@common/intl';

export interface Translation {
  id: string;
  key: string;
  default: string;
  custom: string;
}

export const mapTranslationsToArray = (
  translations: Record<string, string>,
  t: TypedTFunction<LocaleKey>
): Translation[] => {
  return Object.entries(translations)
    .filter(([key]) => t(key as LocaleKey) !== '')
    .map(([key, custom]) => ({
      id: key,
      key,
      default: t(key as LocaleKey),
      custom,
    }));
};

export const mapTranslationsToObject = (
  translations: Translation[]
): Record<string, string> => {
  const asObject = translations
    // Sort alphabetically by key on save
    .sort((a, b) => a.key.localeCompare(b.key))
    .reduce<Record<string, string>>((acc, tr) => {
      // Remove entries where no custom translation is set
      if (tr.custom === tr.default || tr.custom === '') return acc;
      acc[tr.key] = tr.custom;
      return acc;
    }, {});
  return asObject;
};
