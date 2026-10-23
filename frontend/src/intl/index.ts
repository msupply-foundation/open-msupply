// Public surface of the i18n module. Import from '../intl' everywhere else.

// Core
export { t, tPlural, hasTranslation, locale, setLocale } from './intl';
export type { LocaleKey, SupportedLocale, FlatDict } from './locales';
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_META,
  isSupported,
} from './locales';

// Loading / caching / server overrides
export { loadDictionary, invalidateCustomTranslations } from './loadDictionary';
// Installed plugins' catalogues — a layer beneath the host dictionaries.
export { registerPluginTranslations } from './pluginTranslations';

// Detection / switching
export { detectLocale, getUserLocale } from './detectLocale';
export {
  applyUserLocale,
  changeLanguage,
  initialiseLocale,
} from './changeLanguage';
export {
  formatCurrency,
  getCurrencyInfo,
  homeCurrency,
  setHomeCurrency,
} from './currency';
export type { CurrencyInfo, CurrencyDisplay } from './currency';

// Formatting
export {
  formatNumber,
  round,
  roundTo,
  parseNumber,
  intlNumberFormat,
  MAX_FRACTION_DIGITS,
} from './formatNumber';
export {
  decimalPlaces,
  setDecimalPlaces,
  displayNumber,
  displayTotal,
  displayVolume,
  roundedText,
  exactText,
  isRounded,
  DEFAULT_DECIMAL_PLACES,
  VOLUME_DECIMALS,
  ROUNDED_MARK,
} from './numberDisplay';
export type { DisplayedNumber } from './numberDisplay';
export {
  localisedDate,
  localisedTime,
  localisedDateTime,
  utcDateTime,
  customDate,
  exportDate,
  localeDateFormat,
  localisedTimeAgo,
  getDisplayAge,
  DATE_FNS_LOADERS,
} from './formatDateTime';
export { formatFileSize } from './formatFileSize';
export { legacyCodePage } from './legacyCodePage';

// Metadata / misc helpers
export {
  isRtl,
  currentLanguageName,
  languageName,
  languageOptions,
  getLocalisedFullName,
  translateServerError,
} from './intlUtils';
export { measureWord, type MeasureMode } from './measureWord';
