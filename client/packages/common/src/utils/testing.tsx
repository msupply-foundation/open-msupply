import React, { FC } from 'react';
import { AppThemeProvider } from '@openmsupply-client/common';
import { IntlTestProvider } from '../intl/IntlTestProvider';
import { BrowserRouter } from 'react-router-dom';
import { SupportedLocales } from '../intl/intlHelpers';

interface TestingProviderProps {
  locale?: SupportedLocales;
}

export const TestingProvider: FC<TestingProviderProps> = ({
  children,
  locale = 'en',
}) => {
  return (
    <AppThemeProvider>
      <IntlTestProvider locale={locale}>
        <BrowserRouter>{children}</BrowserRouter>
      </IntlTestProvider>
    </AppThemeProvider>
  );
};
