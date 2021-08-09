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
    // importMessages(locale as SupportedLocales).then(setMessages);
    const messages = importMessages(locale as SupportedLocales);
    setMessages(messages);
  }, [locale]);

  return messages ? (
    <ReactIntlProvider locale={locale} messages={messages} key={locale}>
      {props.children}
    </ReactIntlProvider>
  ) : null;
};
