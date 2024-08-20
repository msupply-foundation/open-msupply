import React, { FC, useEffect } from 'react';

import {
  AppFooterPortal,
  Box,
  DetailPanel,
  AppFooter,
  Routes,
  Route,
  RouteBuilder,
  Navigate,
  useLocation,
  useHostContext,
  useGetPageTitle,
  useAuthContext,
  useNotification,
  useTranslation,
  SnackbarProvider,
  BarcodeScannerProvider,
  DetailLoadingSkeleton,
} from '@openmsupply-client/common';
import { AppDrawer, AppBar, Footer, NotFound } from './components';
import { CommandK } from './CommandK';
import { AppRoute } from '@openmsupply-client/config';
import { Settings } from './Admin/Settings';
import {
  DashboardRouter,
  CatalogueRouter,
  DistributionRouter,
  ReplenishmentRouter,
  InventoryRouter,
  DispensaryRouter,
  ColdChainRouter,
  ManageRouter,
  ProgramsRouter,
  ReportsRouter,
} from './routers';
import { RequireAuthentication } from './components/Navigation/RequireAuthentication';
import { QueryErrorHandler } from './QueryErrorHandler';
import { Sync } from './components/Sync';
import { EasterEggModalProvider } from './components';

const NotifyOnLogin = () => {
  const { success } = useNotification();
  const { store, storeId } = useAuthContext();
  const { name } = store || {};
  const t = useTranslation('app');
  const storeChangedNotification = success(
    t('login.store-changed', { store: name })
  );

  useEffect(() => {
    if (!!name) storeChangedNotification();
    // only notify if the store has changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  return <></>;
};

export const Site: FC = () => {
  const location = useLocation();
  const getPageTitle = useGetPageTitle();
  const { setPageTitle } = useHostContext();
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    setPageTitle(pageTitle);
  }, [location, pageTitle, setPageTitle]);

  return (
    <RequireAuthentication>
      <EasterEggModalProvider>
        <CommandK>
          <SnackbarProvider maxSnack={3}>
            <BarcodeScannerProvider>
              <AppDrawer />
              <Box
                flex={1}
                display="flex"
                flexDirection="column"
                overflow="hidden"
              >
                <AppBar />
                <NotifyOnLogin />
                <Box display="flex" flex={1} overflow="auto">
                  <Routes>
                    <Route
                      path={RouteBuilder.create(AppRoute.Dashboard)
                        .addWildCard()
                        .build()}
                      element={
                        <React.Suspense fallback={<DetailLoadingSkeleton />}>
                          <DashboardRouter />
                        </React.Suspense>
                      }
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Catalogue)
                        .addWildCard()
                        .build()}
                      element={
                        <React.Suspense fallback={<DetailLoadingSkeleton />}>
                          <CatalogueRouter />
                        </React.Suspense>
                      }
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Distribution)
                        .addWildCard()
                        .build()}
                      element={
                        <React.Suspense fallback={<DetailLoadingSkeleton />}>
                          <DistributionRouter />
                        </React.Suspense>
                      }
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Replenishment)
                        .addWildCard()
                        .build()}
                      element={
                        <React.Suspense fallback={<DetailLoadingSkeleton />}>
                          <ReplenishmentRouter />
                        </React.Suspense>
                      }
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Inventory)
                        .addWildCard()
                        .build()}
                      element={
                        <React.Suspense fallback={<DetailLoadingSkeleton />}>
                          <InventoryRouter />
                        </React.Suspense>
                      }
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Dispensary)
                        .addWildCard()
                        .build()}
                      element={
                        <React.Suspense fallback={<DetailLoadingSkeleton />}>
                          <DispensaryRouter />
                        </React.Suspense>
                      }
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Coldchain)
                        .addWildCard()
                        .build()}
                      element={
                        <React.Suspense fallback={<DetailLoadingSkeleton />}>
                          <ColdChainRouter />
                        </React.Suspense>
                      }
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Settings)
                        .addWildCard()
                        .build()}
                      element={<Settings />}
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Sync)
                        .addWildCard()
                        .build()}
                      element={<Sync />}
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Manage)
                        .addWildCard()
                        .build()}
                      element={
                        <React.Suspense fallback={<DetailLoadingSkeleton />}>
                          <ManageRouter />
                        </React.Suspense>
                      }
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Programs)
                        .addWildCard()
                        .build()}
                      element={
                        <React.Suspense fallback={<DetailLoadingSkeleton />}>
                          <ProgramsRouter />
                        </React.Suspense>
                      }
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Reports)
                        .addWildCard()
                        .build()}
                      element={
                        <React.Suspense fallback={<DetailLoadingSkeleton />}>
                          <ReportsRouter />
                        </React.Suspense>
                      }
                    />
                    <Route
                      path="/"
                      element={
                        <Navigate
                          replace
                          to={RouteBuilder.create(AppRoute.Dashboard).build()}
                        />
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Box>
                <AppFooter />
                <AppFooterPortal SessionDetails={<Footer />} />
              </Box>
              <DetailPanel />
              <QueryErrorHandler />
            </BarcodeScannerProvider>
          </SnackbarProvider>
        </CommandK>
      </EasterEggModalProvider>
    </RequireAuthentication>
  );
};
