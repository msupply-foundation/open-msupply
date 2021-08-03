import React, { FC } from 'react';
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
} from '@openmsupply-client/common';
import AppDrawer from './AppDrawer';
import AppBar from './AppBar';
import Viewport from './Viewport';
import { useLocalStorageSync } from './useLocalStorageSync';
import { ServiceProvider } from './Service';

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

const Heading: FC = props => (
  <Typography style={{ margin: '100px 50px' }}>[ {props.children} ]</Typography>
);
const Host: FC = () => {
  const drawer = useDrawer();

  return (
    <ReduxProvider>
      <QueryClientProvider client={queryClient}>
        <ServiceProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Viewport>
                <Box display="flex" flex={1}>
                  <AppBar drawer={drawer} />
                  <AppDrawer drawer={drawer} />
                  <React.Suspense fallback={'Loading'}>
                    <Routes>
                      <Route
                        path="dashboard/*"
                        element={<DashboardService />}
                      />
                      <Route
                        path="customers/*"
                        element={<Heading>customers</Heading>}
                      />
                      <Route
                        path="suppliers/*"
                        element={<Heading>suppliers</Heading>}
                      />
                      <Route
                        path="stock/*"
                        element={<Heading>stock</Heading>}
                      />
                      <Route
                        path="tools/*"
                        element={<Heading>tools</Heading>}
                      />
                      <Route
                        path="reports/*"
                        element={<Heading>reports</Heading>}
                      />
                      <Route
                        path="messages/*"
                        element={<Heading>messages</Heading>}
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
      </QueryClientProvider>
    </ReduxProvider>
  );
};

export default Host;
