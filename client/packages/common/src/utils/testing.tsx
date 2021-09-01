import React, { FC } from 'react';
import AppThemeProvider from '../styles/ThemeProvider';
import { IntlTestProvider } from '../intl/IntlTestProvider';
import { BrowserRouter } from 'react-router-dom';
import { SupportedLocales } from '../intl/intlHelpers';
import mediaQuery from 'css-mediaquery';

interface TestingProviderProps {
  locale?: SupportedLocales;
}

export const TestingProvider: FC<TestingProviderProps> = ({
  children,
  locale = 'en',
}) => (
  <IntlTestProvider locale={locale}>
    <AppThemeProvider>
      <BrowserRouter>{children}</BrowserRouter>
    </AppThemeProvider>
  </IntlTestProvider>
);

function createMatchMedia(width: number) {
  return (query: any) => ({
    matches: mediaQuery.match(query, { width }),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });
}

export const setScreenSize_ONLY_FOR_TESTING = (screenSize: number): void => {
  window.matchMedia = createMatchMedia(screenSize);
};
