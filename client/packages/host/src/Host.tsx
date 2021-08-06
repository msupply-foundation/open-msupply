import React, { FC } from 'react';
import {
  Box,
  ReduxProvider,
  AppThemeProvider,
  Typography,
  QueryClient,
  ReactQueryDevtools,
  QueryClientProvider,
  useDrawer,
} from '@openmsupply-client/common';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppDrawer from './AppDrawer';
import AppBar from './AppBar';
import Viewport from './Viewport';

import { ServiceProvider } from './Service';

const queryClient = new QueryClient();

const CustomerContainer = React.lazy(
  () => import('customers/CustomerContainer')
);
const DashboardService = React.lazy(() => import('dashboard/DashboardService'));

const Heading: FC = props => (
  <Typography style={{ margin: '100px 50px' }}>[ {props.children} ]</Typography>
);
const Host: FC = () => {
  const drawer = useDrawer();

  return (
    <ReduxProvider>
      <QueryClientProvider client={queryClient}>
        <ServiceProvider>
          <AppThemeProvider>
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
                        element={<CustomerContainer />}
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
                        path="*"
                        element={<Navigate to="/dashboard" replace />}
                      />
                    </Routes>
                  </React.Suspense>
                </Box>
              </Viewport>
            </BrowserRouter>
          </AppThemeProvider>
        </ServiceProvider>
        <ReactQueryDevtools initialIsOpen />
      </QueryClientProvider>
    </ReduxProvider>
  );
};

export default Host;
