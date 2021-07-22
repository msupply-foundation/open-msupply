import React from 'react';
import { Box, ReduxProvider } from '@openmsupply-client/common';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppDrawer from './AppDrawer';
import AppBar from './AppBar';
import Viewport from './Viewport';
import { useLocalStorageSync } from './useLocalStorageSync';
import { ServiceProvider } from './Service';

// const InvoiceMobXRQService = React.lazy(() => import('mobx_rq_invoices/InvoiceMobXRQService'));
// const MSTInvoiceService = React.lazy(() => import('mst_invoices/MSTInvoiceService'));
// const MobXInvoiceService = React.lazy(() => import('mobx_invoices/MobXInvoiceService'));
// const ReduxToolKitInvoiceService = React.lazy(
//   () => import('redux_toolkit_invoices/ReduxToolkitInvoiceService')
// );
const DashboardService = React.lazy(() => import('dashboard/DashboardService'));
// const InvoiceService = React.lazy(() => import('invoices/InvoiceService'));
// const ProfilePage = React.lazy(() => import('profile/ProfilePage'));

const useDrawer = () => {
  const { value, setItem } = useLocalStorageSync(
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

const Host = () => {
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
                  <Route path="invoices/*" element={<div />} />
                  {/* <Route path="profile/*" element={<ProfilePage />} />
                  <Route path="redux_toolkit_invoices/*" element={<ReduxToolKitInvoiceService />} />
                  <Route path="mobx_invoices/*" element={<MobXInvoiceService />} />
                  <Route path="mst_invoices/*" element={<MSTInvoiceService />} />
                  <Route path="mobx_rq_invoices/*" element={<InvoiceMobXRQService />} /> */}
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
