import create from 'zustand';
import { SupportedLocales } from '../intl/intlHelpers';

type HostContext = {
  locale: SupportedLocales;
  title: string;
  setLocale: (locale: SupportedLocales) => void;
  setTitle: (title: string) => void;
};

const localStorageKey = '@openmsupply-client/localisation/locale';

export const useHostContext = create<HostContext>(set => ({
  locale: (localStorage.getItem(localStorageKey) as SupportedLocales) ?? 'en',
  title: '',
  setLocale: locale => set(state => ({ ...state, locale })),
  setTitle: title => set(state => ({ ...state, title })),
}));

useHostContext.subscribe(({ locale }) => {
  localStorage.setItem(localStorageKey, locale);
});
