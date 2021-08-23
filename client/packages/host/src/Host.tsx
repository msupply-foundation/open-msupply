import React, { FC } from 'react';
import {
  Box,
  ReduxProvider,
  AppThemeProvider,
  Typography,
  QueryClient,
  ReactQueryDevtools,
  QueryClientProvider,
  IntlProvider,
  styled,
  useFormatDate,
  useHostContext,
  useTranslation,
  RouteBuilder,
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
  () => import('customers/CustomerContainer')
);
const DashboardService = React.lazy(() => import('dashboard/DashboardService'));

const Heading: FC<{ locale: string }> = props => {
  const t = useTranslation();
  const formatDate = useFormatDate();
  const date = new Date();

  return (
    <div style={{ margin: '100px 50px' }}>
      <span>
        <Typography>Current locale: {props.locale}</Typography>
        <Typography>
          {t('app.welcome', { name: '<your name here>' })}
        </Typography>
        <Typography>
          Today is{' '}
          {formatDate(date, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </Typography>
      </span>
      <Typography>[ {props.children} ]</Typography>
    </div>
  );
};

const Host: FC = () => {
  const { locale } = useHostContext();

  return (
    <ReduxProvider>
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={locale}>
          <AppThemeProvider>
            <BrowserRouter>
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
                          element={<Heading locale={locale}>suppliers</Heading>}
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
                          element={<Heading locale={locale}>messages</Heading>}
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
            </BrowserRouter>
          </AppThemeProvider>
          <ReactQueryDevtools initialIsOpen />
        </IntlProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
};

export default Host;
