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
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { Viewport } from './components';
import { Login } from './Login';
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
  <React.Suspense fallback={<RandomLoader />}>
    <IntlProvider>
      <ErrorBoundary Fallback={GenericErrorFallback}>
        <QueryClientProvider client={queryClient}>
          <OmSupplyApiProvider url={Environment.API_URL}>
            <AppThemeProvider>
              <BrowserRouter>
                <Viewport>
                  <Box display="flex" style={{ minHeight: '100%' }}>
                    <Routes>
                      <Route
                        path={RouteBuilder.create(AppRoute.Login).build()}
                        element={<Login />}
                      />
                      <Route path="*" element={<Site />} />
                    </Routes>
                  </Box>
                </Viewport>
              </BrowserRouter>
            </AppThemeProvider>
            <ReactQueryDevtools initialIsOpen />
          </OmSupplyApiProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </IntlProvider>
  </React.Suspense>
);

export default Host;
