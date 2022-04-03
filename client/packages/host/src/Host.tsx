import React, { FC } from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Box,
  AppThemeProvider,
  QueryClient,
  ReactQueryDevtools,
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
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { Login, Viewport } from './components';
import { Site } from './Site';
import { AuthenticationAlert } from './components/AuthenticationAlert';

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

const Host: FC = () => (
  <React.Suspense fallback={<div />}>
    <IntlProvider>
      <React.Suspense fallback={<RandomLoader />}>
        <ErrorBoundary Fallback={GenericErrorFallback}>
          <QueryClientProvider client={queryClient}>
            <GqlProvider url={Environment.GRAPHQL_URL}>
              <AuthProvider>
                <AppThemeProvider>
                  <ConfirmationModalProvider>
                    <AlertModalProvider>
                      <BrowserRouter>
                        <AuthenticationAlert />
                        <Viewport>
                          <Box display="flex" style={{ minHeight: '100%' }}>
                            <Routes>
                              <Route
                                path={RouteBuilder.create(
                                  AppRoute.Login
                                ).build()}
                                element={<Login />}
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
              <ReactQueryDevtools initialIsOpen />
            </GqlProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </React.Suspense>
    </IntlProvider>
  </React.Suspense>
);

export default Host;
