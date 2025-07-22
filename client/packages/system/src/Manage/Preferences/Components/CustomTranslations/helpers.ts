import { LocaleKey, TypedTFunction } from '@common/intl';

export interface Translation {
  id: string;
  key: string;
  default: string;
  custom: string;
}

export const mapTranslations = (
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
