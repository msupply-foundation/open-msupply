import React, { FC, PropsWithChildren, useEffect } from 'react';
import { AppThemeProvider } from '@common/styles';
import { SupportedLocales } from '@common/intl';
import { PropsWithChildrenOnly } from '@common/types';
import mediaQuery from 'css-mediaquery';
import { SnackbarProvider } from 'notistack';
import { QueryClientProvider, QueryClient } from 'react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TableProvider, createTableStore } from '../../ui/layout/tables';
import { createQueryParamsStore, GqlProvider, KBarProvider } from '../..';
import { Environment } from '@openmsupply-client/config';
import { ConfirmationModalProvider } from '../../ui/components/modals';
import { renderHook } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import app from '@common/intl/locales/en/app.json';
import common from '@common/intl/locales/en/common.json';
import appFr from '@common/intl/locales/fr/app.json';
import commonFr from '@common/intl/locales/fr/common.json';
import appAr from '@common/intl/locales/ar/app.json';
import commonAr from '@common/intl/locales/ar/common.json';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ turns retries off
      retry: false,
    },
  },
});

interface IntlTestProviderProps {
  locale: SupportedLocales;
}

const resources = {
  ar: {
    app: { ...app, ...appAr },
    common: { ...common, ...commonAr },
  },
  en: { app, common },
  fr: {
    app: { ...app, ...appFr },
    common: { ...common, ...commonFr },
  },
};

const IntlTestProvider: FC<PropsWithChildren<IntlTestProviderProps>> = ({
  children,
  locale,
}) => {
  useEffect(() => {
    i18next.changeLanguage(locale);
  }, [locale]);
  if (!i18next.isInitialized) {
    i18next.use(initReactI18next).init({
      resources,
      debug: false,
      lng: locale,
      fallbackLng: 'en',
      ns: ['app', 'common'],
      defaultNS: 'common',
      fallbackNS: 'common',
      interpolation: {
        escapeValue: false,
      },
    });
  }
  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
};

interface TestingRouterProps {
  initialEntries: string[];
}

export const TestingRouter: FC<PropsWithChildren<TestingRouterProps>> = ({
  children,
  initialEntries,
}) => (
  <MemoryRouter initialEntries={initialEntries}>
    <Routes>{children}</Routes>
  </MemoryRouter>
);

export const TestingRouterContext: FC<
  PropsWithChildren<{ initialEntries?: string[] }>
> = ({ children, initialEntries = ['/testing'] }) => (
  <TestingRouter initialEntries={initialEntries}>
    <Route path={initialEntries[0]} element={<>{children}</>} />
  </TestingRouter>
);

export const TestingProvider: FC<
  PropsWithChildren<{ locale?: SupportedLocales }>
> = ({ children, locale = 'en' }) => (
  <React.Suspense fallback={<span>[suspended]</span>}>
    <QueryClientProvider client={queryClient}>
      <GqlProvider url={Environment.GRAPHQL_URL}>
        <SnackbarProvider maxSnack={3}>
          <IntlTestProvider locale={locale}>
            <TableProvider
              createStore={createTableStore}
              queryParamsStore={createQueryParamsStore({
                initialSortBy: { key: 'id' },
                initialFilterBy: {
                  comment: { equalTo: 'a' },
                  allocatedDatetime: { equalTo: '1/1/2020' },
                },
              })}
            >
              <AppThemeProvider>{children}</AppThemeProvider>
            </TableProvider>
          </IntlTestProvider>
        </SnackbarProvider>
      </GqlProvider>
    </QueryClientProvider>
  </React.Suspense>
);

export const StoryProvider: FC<PropsWithChildrenOnly> = ({ children }) => (
  <React.Suspense fallback={<span>?</span>}>
    <QueryClientProvider client={queryClient}>
      <GqlProvider url={Environment.GRAPHQL_URL}>
        <SnackbarProvider maxSnack={3}>
          <IntlTestProvider locale="en">
            <TableProvider createStore={createTableStore}>
              <AppThemeProvider>
                <KBarProvider actions={[]}>
                  <ConfirmationModalProvider>
                    {children}
                  </ConfirmationModalProvider>
                </KBarProvider>
              </AppThemeProvider>
            </TableProvider>
          </IntlTestProvider>
        </SnackbarProvider>
      </GqlProvider>
    </QueryClientProvider>
  </React.Suspense>
);

function createMatchMedia(width: number) {
  return (query: string) => ({
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

export const renderHookWithProvider = <Props, Result>(
  hook: (props: Props) => Result,
  options?: {
    providerProps?: { locale: SupportedLocales };
  }
) =>
  renderHook(hook, {
    wrapper: ({ children }: { children?: React.ReactNode }) => (
      <TestingProvider {...options?.providerProps}>{children}</TestingProvider>
    ),
  });
