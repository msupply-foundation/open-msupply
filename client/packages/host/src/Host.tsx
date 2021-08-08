import React, { FC } from 'react';
// import { FormattedDate } from 'react-intl'

import {
  Box,
  ReduxProvider,
  ThemeProvider,
  Typography,
  QueryClient,
  ReactQueryDevtools,
  QueryClientProvider,
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  IntlProvider,
  useFormatMessage,
} from '@openmsupply-client/common';
import AppDrawer from './AppDrawer';
import AppBar from './AppBar';
import Viewport from './Viewport';
import { useLocalStorageSync } from './useLocalStorageSync';
import { ServiceProvider } from './Service';

import { SupportedLocales } from '@openmsupply-client/common/src/intl/intlHelpers';

const queryClient = new QueryClient();

const DashboardService = React.lazy(() => import('dashboard/DashboardService'));
const TransactionService = React.lazy(
  () => import('transactions/TransactionService')
);

const useDrawer = () => {
  const { value, setItem } = useLocalStorageSync<boolean>(
    '@openmsupply-client/appdrawer/open'
  );

  return {
    open: value,
    closeDrawer() {
      setItem(false);
    },
    openDrawer() {
      setItem(true);
    },
  };
};

const Heading: FC<{ locale: string }> = props => {
  const formatMessage = useFormatMessage();
  return (
    <div style={{ margin: '100px 50px' }}>
      <span>
        <Typography>Current locale: {props.locale}</Typography>
        {formatMessage('app.welcome', { name: 'Doofus!' })}
        {/* today is <FormattedDate value={date} year="numeric"
          month="long"
          day="numeric"
          weekday="long" /> */}
      </span>
      <Typography >[ {props.children} ]</Typography>
    </div>
  );
}

const Host: FC = () => {
  const drawer = useDrawer();
  const [locale, setLocale] = React.useState<SupportedLocales>('en')

  return (
    <ReduxProvider>
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale={locale}>
          <ServiceProvider>
            <ThemeProvider>
              <BrowserRouter>
                <Viewport>
                  <Box display="flex" flex={1}>
                    <AppBar drawer={drawer} setLocale={setLocale} locale={locale} />
                    <AppDrawer drawer={drawer} />
                    <React.Suspense fallback={'Loading'}>
                      <Routes>
                        <Route
                          path="dashboard/*"
                          element={<DashboardService />}
                        />
                        <Route
                          path="customers/*"
                          element={<Heading locale={locale}>customers</Heading>}
                        />
                        <Route
                          path="suppliers/*"
                          element={<Heading locale={locale}>suppliers</Heading>}
                        />
                        <Route
                          path="stock/*"
                          element={<Heading locale={locale}>stock</Heading>}
                        />
                        <Route
                          path="tools/*"
                          element={<Heading locale={locale}>tools</Heading>}
                        />
                        <Route
                          path="reports/*"
                          element={<Heading locale={locale}>reports</Heading>}
                        />
                        <Route
                          path="messages/*"
                          element={<Heading locale={locale}>messages</Heading>}
                        />
                        <Route
                          path="transactions/*"
                          element={<TransactionService />}
                        />

                        <Route
                          path="*"
                          element={<Navigate to="/dashboard" replace />}
                        />
                      </Routes>
                    </React.Suspense>
                  </Box>
                </Viewport>
              </BrowserRouter>
            </ThemeProvider>
          </ServiceProvider>
          <ReactQueryDevtools initialIsOpen />
        </IntlProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
};

export default Host;
