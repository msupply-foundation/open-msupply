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
  styled,
  useHostContext,
  RouteBuilder,
  ErrorBoundary,
  GenericErrorFallback,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppDrawer from './AppDrawer';
import AppBar from './AppBar';
import Viewport from './Viewport';

const Content = styled(Box)({
  marginTop: 90,
  overflowY: 'scroll',
  height: '100vh',
});
const queryClient = new QueryClient();

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
                  <AppBar />
                  <Box display="flex" flex={1}>
                    <AppDrawer />
                    <Content flex={1}>
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
                            element={<Heading locale={locale}>reports</Heading>}
                          />
                          <Route
                            path={RouteBuilder.create(AppRoute.Messages)
                              .addWildCard()
                              .build()}
                            element={
                              <Heading locale={locale}>messages</Heading>
                            }
                          />
                          <Route
                            path="*"
                            element={<Navigate to="/dashboard" replace />}
                          />
                        </Routes>
                      </React.Suspense>
                    </Content>
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
