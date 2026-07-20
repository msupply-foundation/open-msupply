// Public surface of the i18n module. Import from '../intl' everywhere else.

// Core
export { t, tPlural, locale, setLocale } from './intl';
export type { LocaleKey, SupportedLocale, FlatDict } from './locales';
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_META,
  isSupported,
} from './locales';

// Loading / caching / server overrides
export { loadDictionary, invalidateCustomTranslations } from './loadDictionary';

// Detection / switching
export { detectLocale, getUserLocale } from './detectLocale';
export { changeLanguage, initialiseLocale } from './changeLanguage';
export { getCurrencyInfo, homeCurrency, setHomeCurrency } from './currency';
export type { CurrencyInfo, CurrencyDisplay } from './currency';

// Formatting
export {
  formatNumber,
  round,
  parseNumber,
  intlNumberFormat,
} from './formatNumber';
export {
  localisedDate,
  localisedTime,
  localisedDateTime,
  customDate,
  localisedDistanceToNow,
  getDisplayAge,
} from './formatDateTime';

// Metadata / misc helpers
export {
  isRtl,
  currentLanguageName,
  languageOptions,
  getLocalisedFullName,
  getPlural,
  translateServerError,
} from './intlUtils';
