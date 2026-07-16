import { setLocale } from './intl';
import { isSupported, type SupportedLocale } from './locales';
import { loadDictionary } from './loadDictionary';
import { persistUserLocale, rememberLastLocale } from './detectLocale';

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

  await loadDictionary(locale);
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
  await loadDictionary(locale);
  setLocale(locale);
  rememberLastLocale(locale);
};
