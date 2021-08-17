import React, { FC } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import en from './locales/en.json';

export const IntlTestProvider: FC = ({ children }) => {
  return (
    <ReactIntlProvider locale="en" messages={en}>
      {children}
    </ReactIntlProvider>
  );
};
