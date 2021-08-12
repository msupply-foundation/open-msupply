import create from 'zustand';
import { SupportedLocales } from '../intl/intlHelpers';

type LocalisationController = {
  locale: SupportedLocales;
  setLocale: (locale: SupportedLocales) => void;
};

const localStorageKey = '@openmsupply-client/localisation/locale';

export const useLocalisation = create<LocalisationController>(set => ({
  locale: (localStorage.getItem(localStorageKey) as SupportedLocales) ?? 'en',
  setLocale: locale => set(state => ({ ...state, locale })),
}));

useLocalisation.subscribe(({ locale }) => {
  localStorage.setItem(localStorageKey, locale);
});
