import React, { FC } from 'react';
import { Box, ReduxProvider } from '@openmsupply-client/common';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppDrawer from './AppDrawer';
import AppBar from './AppBar';
import Viewport from './Viewport';
import { useLocalStorageSync } from './useLocalStorageSync';
import { ServiceProvider } from './Service';

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

const Host: FC = () => {
  const drawer = useDrawer();

  return (
    <ReduxProvider>
      <ServiceProvider>
        <BrowserRouter>
          <Viewport>
            <Box display="flex" flex={1}>
              <AppBar drawer={drawer} />
              <AppDrawer drawer={drawer} />
              <React.Suspense fallback={'Loading'}>
                <Routes>
                  <Route path="dashboard/*" element={<DashboardService />} />
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
      </ServiceProvider>
    </ReduxProvider>
  );
};

export default Host;
