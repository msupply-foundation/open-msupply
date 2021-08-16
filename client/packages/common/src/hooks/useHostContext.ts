import create from 'zustand';
import { SupportedLocales } from '../intl/intlHelpers';

type HostContext = {
  locale: SupportedLocales;
  setLocale: (locale: SupportedLocales) => void;
};

const localStorageKey = '@openmsupply-client/localisation/locale';

export const useHostContext = create<HostContext>(set => ({
  locale: (localStorage.getItem(localStorageKey) as SupportedLocales) ?? 'en',
  setLocale: locale => set(state => ({ ...state, locale })),
}));

useHostContext.subscribe(({ locale }) => {
  localStorage.setItem(localStorageKey, locale);
});
