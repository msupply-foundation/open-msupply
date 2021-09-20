import React, { FC } from 'react';
import {
  Box,
  AppThemeProvider,
  Typography,
  QueryClient,
  ReactQueryDevtools,
  QueryClientProvider,
  IntlProvider,
  SnackbarProvider,
  useHostContext,
  RouteBuilder,
  ErrorBoundary,
  GenericErrorFallback,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppDrawer from './AppDrawer';
import AppBar from './AppBar';
import DetailPanel from './DetailPanel';
import Viewport from './Viewport';
import NotFound from './NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const CustomerContainer = React.lazy(
  () => import('@openmsupply-client/customers/src/CustomerContainer')
);
const DashboardService = React.lazy(
  () => import('@openmsupply-client/dashboard/src/DashboardService')
);

const Heading: FC<{ locale: string }> = props => (
  <div style={{ margin: 50 }}>
    <Typography>[ Placeholder page: {props.children} ]</Typography>
  </div>
);

const Host: FC = () => {
  const { locale } = useHostContext();

  return (
    <ErrorBoundary Fallback={GenericErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={locale}>
          <AppThemeProvider>
            <BrowserRouter>
              <SnackbarProvider maxSnack={3}>
                <Viewport>
                  <Box display="flex">
                    <AppDrawer />
                    <Box display="flex" flex={1} flexDirection="column">
                      <AppBar />
                      <Box flex={1} display="flex">
                        <React.Suspense fallback={'Loading'}>
                          <Routes>
                            <Route
                              path={RouteBuilder.create(AppRoute.Dashboard)
                                .addWildCard()
                                .build()}
                              element={<DashboardService />}
                            />
                            <Route
                              path={RouteBuilder.create(AppRoute.Customers)
                                .addWildCard()
                                .build()}
                              element={<CustomerContainer />}
                            />
                            <Route
                              path={RouteBuilder.create(AppRoute.Suppliers)
                                .addWildCard()
                                .build()}
                              element={
                                <Heading locale={locale}>suppliers</Heading>
                              }
                            />
                            <Route
                              path={RouteBuilder.create(AppRoute.Stock)
                                .addWildCard()
                                .build()}
                              element={<Heading locale={locale}>stock</Heading>}
                            />
                            <Route
                              path={RouteBuilder.create(AppRoute.Tools)
                                .addWildCard()
                                .build()}
                              element={<Heading locale={locale}>tools</Heading>}
                            />
                            <Route
                              path={RouteBuilder.create(AppRoute.Reports)
                                .addWildCard()
                                .build()}
                              element={
                                <Heading locale={locale}>reports</Heading>
                              }
                            />
                            <Route
                              path={RouteBuilder.create(AppRoute.Messages)
                                .addWildCard()
                                .build()}
                              element={
                                <Heading locale={locale}>messages</Heading>
                              }
                            />
                            <Route path="/" element={<DashboardService />} />

                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </React.Suspense>
                      </Box>
                    </Box>
                    <DetailPanel />
                  </Box>
                </Viewport>
              </SnackbarProvider>
            </BrowserRouter>
          </AppThemeProvider>
          <ReactQueryDevtools initialIsOpen />
        </IntlProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default Host;
