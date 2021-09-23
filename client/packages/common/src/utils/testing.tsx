import React, { FC } from 'react';
import AppThemeProvider from '../styles/ThemeProvider';
import { IntlTestProvider } from '../intl/IntlTestProvider';
import { SupportedLocales } from '../intl/intlHelpers';
import mediaQuery from 'css-mediaquery';
import { SnackbarProvider } from 'notistack';
import { QueryClientProvider, QueryClient } from 'react-query';
import { MemoryRouter, Routes } from 'react-router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ turns retries off
      retry: false,
    },
  },
});

interface TestingProviderProps {
  locale?: SupportedLocales;
}

interface TestingRouterProps {
  initialEntries: string[];
}

export const TestingRouter: FC<TestingRouterProps> = ({
  children,
  initialEntries,
}) => (
  <MemoryRouter initialEntries={initialEntries}>
    <Routes>{children}</Routes>
  </MemoryRouter>
);

export const TestingProvider: FC<TestingProviderProps> = ({
  children,
  locale = 'en',
}) => (
  <QueryClientProvider client={queryClient}>
    <SnackbarProvider maxSnack={3}>
      <IntlTestProvider locale={locale}>
        <AppThemeProvider>{children}</AppThemeProvider>
      </IntlTestProvider>
    </SnackbarProvider>
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
