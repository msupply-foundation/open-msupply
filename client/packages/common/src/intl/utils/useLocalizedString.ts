import { useIntlUtils } from './IntlUtils';

export type LocalizedString = { en: string } & { [locale: string]: string };

/**
 * Resolve a plugin-supplied {@link LocalizedString} against the current locale.
 *
 * Fallback order: exact match (e.g. `fr-DJ`) -> language part (`fr`) -> `en`.
 */
export const useLocalizedString = (value: LocalizedString | undefined): string => {
  const { currentLanguage } = useIntlUtils();
  if (!value) return '';
  if (value[currentLanguage]) return value[currentLanguage] as string;
  const base = (currentLanguage as string).split('-')[0];
  if (base && value[base]) return value[base] as string;
  return value.en;
};
