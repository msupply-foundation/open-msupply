import React, { FC } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { LocaleMessages, SupportedLocales } from './intlHelpers';
import en from './locales/en.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';

const locales: Record<SupportedLocales, LocaleMessages> = {
  en,
  fr,
  pt,
  ar,
};

interface IntlTestProviderProps {
  locale: SupportedLocales;
}

export const IntlTestProvider: FC<IntlTestProviderProps> = ({
  children,
  locale,
}) => {
  return (
    <ReactIntlProvider locale="en" messages={locales[locale]}>
      {children}
    </ReactIntlProvider>
  );
};
