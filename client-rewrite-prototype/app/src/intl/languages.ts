/*
 * Supported languages — mirrors the current app's list
 *   client/packages/common/src/intl/utils/IntlUtils.ts (languageOptions, rtlLocales)
 * Labels are the languages' own native names, exactly as the real app shows them.
 */

export interface LanguageOption {
  label: string;
  value: string;
}

export const languageOptions: LanguageOption[] = [
  { label: 'عربي', value: 'ar' },
  { label: 'دری', value: 'prs' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
  { label: 'Français', value: 'fr' },
  { label: 'Français (Djibouti)', value: 'fr-DJ' },
  { label: 'پښتو', value: 'ps' },
  { label: 'Português', value: 'pt' },
  { label: 'Русский', value: 'ru' },
  { label: 'Tetum', value: 'tet' },
];

/** Right-to-left locales (IntlUtils.ts: rtlLocales). */
export const rtlLocales = ['ar', 'prs', 'ps'];

export const isRtlLocale = (locale: string) => rtlLocales.includes(locale);

export const languageLabel = (value: string) =>
  languageOptions.find(o => o.value === value)?.label ?? value;
