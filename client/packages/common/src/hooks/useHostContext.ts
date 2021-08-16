import create from 'zustand';
import { LocaleKey, SupportedLocales } from '../intl/intlHelpers';

type HostContext = {
  locale: SupportedLocales;
  titleKey?: LocaleKey;
  setLocale: (locale: SupportedLocales) => void;
  setTitleKey: (titleKey: LocaleKey) => void;
};

const localStorageKey = '@openmsupply-client/localisation/locale';

export const useHostContext = create<HostContext>(set => ({
  locale: (localStorage.getItem(localStorageKey) as SupportedLocales) ?? 'en',
  setLocale: locale => set(state => ({ ...state, locale })),
  setTitleKey: titleKey => set(state => ({ ...state, titleKey })),
}));

useHostContext.subscribe(({ locale }) => {
  localStorage.setItem(localStorageKey, locale);
});
