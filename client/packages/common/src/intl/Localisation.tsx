import * as React from 'react';
import { createContext, FC, useContext, useState } from 'react';
import { IntlProvider } from 'react-intl';

export interface Localisation {
  locale: string;
  messages: Record<string, string>;
}
export interface LocalisationContext extends Localisation {
  addMessages: (messages: Record<string, string>) => void;
  setLocale: (locale: string) => void;
}

export const Context = createContext<LocalisationContext>({
  locale: 'en',
  messages: {},
  addMessages: () => {},
  setLocale: () => {},
});

const useLocalisation = () => {
  //   const [messages, setMessages] = useState<Record<string, string>>({});
  const [localisation, setLocalisation] = useState<Localisation>({
    locale: 'en',
    messages: {},
  });

  const addMessages = (newMessages: Record<string, string>) => {
    const { messages } = localisation;
    const newLocalisation: Localisation = {
      ...localisation,
      messages: { ...messages, ...newMessages },
    };
    setLocalisation(newLocalisation);
  };

  const setLocale = (locale: string) =>
    setLocalisation({ ...localisation, locale });

  return {
    ...localisation,
    addMessages,
    setLocale,
  };
};

export const useLocalisationContext = (): LocalisationContext => {
  const context = useContext(Context);

  if (context === undefined) {
    throw new Error(
      'LocalisationContext value is undefined. Make sure you use the LocalisationProvider before using the context.'
    );
  }

  return context;
};

export const LocalisationProvider: FC<{ locale: string }> = ({
  children,
  locale,
}): JSX.Element => {
  const value = useLocalisation();
  const { messages } = value;
  return (
    <Context.Provider value={value}>
      <IntlProvider locale={locale} messages={messages} key={locale}>
        {children}
      </IntlProvider>
    </Context.Provider>
  );
};
