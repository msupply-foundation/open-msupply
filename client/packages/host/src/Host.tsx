import React, { PropsWithChildren } from 'react';
import Bugsnag from '@bugsnag/js';
import {
  BrowserRouter,
  Routes,
  Route,
  Box,
  AppThemeProvider,
  QueryClient,
  // ReactQueryDevtools,
  QueryClientProvider,
  RouteBuilder,
  ErrorBoundary,
  GenericErrorFallback,
  GqlProvider,
  IntlProvider,
  RandomLoader,
  ConfirmationModalProvider,
  AuthProvider,
  AlertModalProvider,
  EnvUtils,
  LocalStorage,
  AuthError,
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { Initialise, Login, Viewport } from './components';
import { Site } from './Site';
import { ErrorAlert } from './components/ErrorAlert';
import { Discovery } from './components/Discovery';
import { Android } from './components/Android';
import { useInitPlugins } from './plugins';
import { BackButtonHandler } from './BackButtonHandler';

const appVersion = require('../../../../package.json').version; // eslint-disable-line @typescript-eslint/no-var-requires

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // These are disabled during development because they're
      // annoying to have constantly refetching.
      refetchOnWindowFocus: EnvUtils.isProduction(),
      retry: EnvUtils.isProduction(),
      // This is the default in v4 which is currently in alpha as it is
      // what most users think the default is.
      // This will subscribe components of a query only to the data they
      // destructure. I.e. if the component does not read the isLoading
      // field, the component will not re-render when the state changes.
      notifyOnChangeProps: 'tracked',
    },
  },
});

Bugsnag.start({
  apiKey: 'a09ce9e95c27ac1b70ecf3c311e684ab',
  appVersion: appVersion,
  enabledBreadcrumbTypes: ['error'],
});

const skipRequest = () =>
  LocalStorage.getItem('/error/auth') === AuthError.NoStoreAssigned;

const PluginProvider: React.FC<PropsWithChildren> = ({ children }) => {
  useInitPlugins();
  return <>{children}</>;
};

const Host = () => (
  <React.Suspense fallback={<div />}>
    <IntlProvider>
      <React.Suspense fallback={<RandomLoader />}>
        <ErrorBoundary Fallback={GenericErrorFallback}>
          <QueryClientProvider client={queryClient}>
            <GqlProvider
              url={Environment.GRAPHQL_URL}
              skipRequest={skipRequest}
            >
              <PluginProvider>
                <AuthProvider>
                  <AppThemeProvider>
                    <ConfirmationModalProvider>
                      <AlertModalProvider>
                        <BrowserRouter>
                          <ErrorAlert />
                          <BackButtonHandler />
                          <Viewport>
                            <Box display="flex" style={{ minHeight: '100%' }}>
                              <Routes>
                                <Route
                                  path={RouteBuilder.create(
                                    AppRoute.Initialise
                                  ).build()}
                                  element={<Initialise />}
                                />
                                <Route
                                  path={RouteBuilder.create(
                                    AppRoute.Login
                                  ).build()}
                                  element={<Login />}
                                />
                                <Route
                                  path={RouteBuilder.create(
                                    AppRoute.Discovery
                                  ).build()}
                                  element={<Discovery />}
                                />
                                <Route
                                  path={RouteBuilder.create(
                                    AppRoute.Android
                                  ).build()}
                                  element={<Android />}
                                />
                                <Route path="*" element={<Site />} />
                              </Routes>
                            </Box>
                          </Viewport>
                        </BrowserRouter>
                      </AlertModalProvider>
                    </ConfirmationModalProvider>
                  </AppThemeProvider>
                </AuthProvider>
              </PluginProvider>
              {/* <ReactQueryDevtools initialIsOpen /> */}
            </GqlProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </React.Suspense>
    </IntlProvider>
  </React.Suspense>
);

export default Host;
