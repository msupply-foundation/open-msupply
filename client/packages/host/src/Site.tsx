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
                      element={<DashboardRouter />}
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Catalogue)
                        .addWildCard()
                        .build()}
                      element={<CatalogueRouter />}
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Distribution)
                        .addWildCard()
                        .build()}
                      element={<DistributionRouter />}
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Replenishment)
                        .addWildCard()
                        .build()}
                      element={<ReplenishmentRouter />}
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Inventory)
                        .addWildCard()
                        .build()}
                      element={<InventoryRouter />}
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Dispensary)
                        .addWildCard()
                        .build()}
                      element={<DispensaryRouter />}
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Coldchain)
                        .addWildCard()
                        .build()}
                      element={<ColdChainRouter />}
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
                      element={<ManageRouter />}
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Programs)
                        .addWildCard()
                        .build()}
                      element={<ProgramsRouter />}
                    />
                    <Route
                      path={RouteBuilder.create(AppRoute.Reports)
                        .addWildCard()
                        .build()}
                      element={<ReportsRouter />}
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
