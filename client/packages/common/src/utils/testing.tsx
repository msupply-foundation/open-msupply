import React, { FC } from 'react';
import AppThemeProvider from '../styles/ThemeProvider';
import { IntlTestProvider } from '../intl/IntlTestProvider';
import { SupportedLocales } from '../intl/intlHelpers';
import mediaQuery from 'css-mediaquery';
import { QueryClientProvider, QueryClient } from 'react-query';

const queryClient = new QueryClient();
interface TestingProviderProps {
  locale?: SupportedLocales;
}

export const TestingProvider: FC<TestingProviderProps> = ({
  children,
  locale = 'en',
}) => (
  <QueryClientProvider client={queryClient}>
    <IntlTestProvider locale={locale}>
      <AppThemeProvider>{children}</AppThemeProvider>
    </IntlTestProvider>
  </QueryClientProvider>
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
