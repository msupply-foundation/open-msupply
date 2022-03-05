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
  OmSupplyApiProvider,
  IntlProvider,
  RandomLoader,
  ConfirmationModalProvider,
  AuthProvider,
  AlertModalProvider,
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { Login, Viewport } from './components';
import { Site } from './Site';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const Host: FC = () => (
  <React.Suspense fallback={<div />}>
    <IntlProvider>
      <React.Suspense fallback={<RandomLoader />}>
        <ErrorBoundary Fallback={GenericErrorFallback}>
          <QueryClientProvider client={queryClient}>
            <OmSupplyApiProvider url={Environment.API_URL}>
              <AuthProvider>
                <AppThemeProvider>
                  <ConfirmationModalProvider>
                    <AlertModalProvider>
                      <BrowserRouter>
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
            </OmSupplyApiProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </React.Suspense>
    </IntlProvider>
  </React.Suspense>
);

export default Host;
