import { CustomDetector } from 'i18next-browser-languagedetector';

export const browserLanguageDetector: CustomDetector = {
  name: 'omsBrowserLanguageDetector',
  lookup: () => {
    const found: string[] = [];
    const add = (languageOrLocale?: string) => {
      if (!languageOrLocale) return;
      if (/^[a-z]{2}$/i.test(languageOrLocale)) {
        found.push(languageOrLocale);
      } else {
        const language = languageOrLocale.split('-')[0];
        if (language) found.push(language);
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
