import React from 'react';
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
