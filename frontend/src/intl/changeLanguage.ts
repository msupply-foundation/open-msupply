import { setLocale } from './intl';
import {
  DEFAULT_LOCALE,
  isSupported,
  LOCALE_META,
  type SupportedLocale,
} from './locales';
import { loadDictionary } from './loadDictionary';
import { loadDateFnsLocale } from './formatDateTime';
import { persistUserLocale, rememberLastLocale } from './detectLocale';

// Everything a locale needs resident before it goes active: its own dictionary,
// its base locale's if it's a regional variant (`fr-DJ` → `fr`), and the
// English base (spec/i18n → translating text) — a partial catalog falls back
// through both, so both must be loaded for that fallback to resolve — plus the
// language's date-fns locale, which is lazily chunked for the same reason the
// catalogs are. When the target IS English this is a single dictionary load.
// loadDictionary and loadDateFnsLocale are cache-first and never throw, so the
// extra loads are cheap and safe.
const loadLocaleAssets = async (locale: SupportedLocale): Promise<void> => {
  const dictionaries = new Set<SupportedLocale>([DEFAULT_LOCALE, locale]);
  const base = LOCALE_META[locale].base;
  if (base) dictionaries.add(base);

  await Promise.all([
    ...[...dictionaries].map(loadDictionary),
    loadDateFnsLocale(locale),
  ]);
};

/**
 * Switch the active language. Direct call — click-through traceable — awaited
 * by the caller (a language switcher, or login once the profile locale is
 * known). Loads the dictionary before flipping the signal so strings are ready
 * when the UI re-renders, then persists the choice.
 */
export const changeLanguage = async (
  code: string,
  username?: string
): Promise<void> => {
  if (!isSupported(code)) return;
  const locale: SupportedLocale = code;

  await loadLocaleAssets(locale);
  setLocale(locale);

  if (username) persistUserLocale(username, locale);
  else rememberLastLocale(locale);
};

/**
 * Initialise i18n at startup: resolve the locale, load its dictionary, and set
 * the signal. Callers (App startup) await this in their loading phase so the
 * app never paints untranslated keys.
 */
export const initialiseLocale = async (
  locale: SupportedLocale
): Promise<void> => {
  await loadLocaleAssets(locale);
  setLocale(locale);
  rememberLastLocale(locale);
};
