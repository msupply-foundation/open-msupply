import { CustomDetector } from 'i18next-browser-languagedetector';

export const browserLanguageDetector: CustomDetector = {
  name: 'omsBrowserLanguageDetector',
  // the language is now supplied by the user profile
  // and set on login, so the below code is not actually needed
  // Implementing the language detector allows the language
  // to be cached in the browser and retained on page refresh
  lookup: () => {
    const found: string[] = [];
    const add = (languageOrLocale?: string) => {
      if (!languageOrLocale) return;
      const parsed = /(^[a-z]{2})(-(.*))?/.exec(languageOrLocale);
      if (parsed) {
        if (parsed.length > 1 && !!parsed[1]) found.push(parsed[1]);
      } else {
        found.push(languageOrLocale);
      }
    };
    if (typeof navigator !== 'undefined') {
      if (navigator.languages) {
        // chrome only; not an array, so can't use .push.apply instead of iterating
        for (let i = 0; i < navigator.languages.length; i++) {
          const locale = navigator.languages[i];
          add(locale);
        }
      }
      if ((navigator as any).userLanguage) {
        add((navigator as any).userLanguage);
      }
      if (navigator.language) {
        add(navigator.language);
      }
    }
    return found.length > 0 ? found : undefined;
  },
};
