import React from 'react';
import i18next from 'i18next';
import Backend from 'i18next-chained-backend';
import LocalStorageBackend from 'i18next-localstorage-backend';
import HttpApi from 'i18next-http-backend';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import {
  LocaleMessages,
  SupportedLocales,
  importMessages,
} from './intlHelpers';
export const IntlProvider: React.FC<
  Omit<React.ComponentProps<typeof ReactIntlProvider>, 'messages'> & {
    messages?: LocaleMessages;
  }
> = props => {
  const { locale } = props;
  const [messages, setMessages] = React.useState<Record<string, string> | null>(
    null
  );
  React.useEffect(() => {
    importMessages(locale as SupportedLocales).then(setMessages);
  }, [locale]);

  // to ensure local date formatting, use the full locale otherwise 'en' === 'en-US'
  const re = new RegExp(`^${locale}-[A-Z]+$`);
  const intlLocale = re.test(navigator.language) ? navigator.language : locale;
  return messages ? (
    <ReactIntlProvider locale={intlLocale} messages={messages} key={locale}>
      {props.children}
    </ReactIntlProvider>
  ) : null;
};

const defaultNS = 'app';
export const IntlProviderNext: React.FC = ({ children }) => {
  React.useEffect(() => {
    i18next
      .use(initReactI18next) // passes i18n down to react-i18next
      .use(Backend)
      .use(LanguageDetector)
      .init({
        backend: {
          backends: [
            LocalStorageBackend, // primary backend
            HttpApi, // fallback backend
          ],
          backendOptions: [
            {
              /* options for primary backend */
            },
            {
              /* options for secondary backend */
              loadPath: '/locales/{{lng}}/{{ns}}.json',
            },
          ],
        },
        debug: true,
        defaultNS,
        ns: defaultNS, // behaving as I expect defaultNS should. Without specifying ns here, a request is made to 'translation.json'
        fallbackLng: 'en',
        fallbackNS: 'common',
        interpolation: {
          escapeValue: false, // not needed for react!!
        },
      });
  }, []);

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
};
