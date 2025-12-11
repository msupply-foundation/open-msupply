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
  useIsGapsStoreOnly,
  useBlockNavigation,
  Platform,
  EnvUtils,
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
import { EasterEggModalProvider } from './components';
import { Help } from './Help/Help';
import { SyncModalProvider } from './components/Sync';
import { MobileNavBar } from './components/MobileNavBar';

const NotifyOnLogin = () => {
  const { success } = useNotification();
  const { store, storeId } = useAuthContext();
  const { name } = store || {};
  const t = useTranslation();
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

// Component to avoid re-calculation when blocking state changes (when isDirty is used for the first time in component)
const Blocker = () => {
  useBlockNavigation();
  return null;
};

export const Site: FC = () => {
  const location = useLocation();
  const getPageTitle = useGetPageTitle();
  const { setPageTitle } = useHostContext();
  const pageTitle = getPageTitle(location.pathname);
  const isGapsStore = useIsGapsStoreOnly();
  const isAndroid = EnvUtils.platform === Platform.Android;

  useEffect(() => {
    setPageTitle(pageTitle);
  }, [location, pageTitle, setPageTitle]);

  return (
    <RequireAuthentication>
      <Blocker />
      <EasterEggModalProvider>
        <SyncModalProvider>
          <CommandK>
            <SnackbarProvider maxSnack={3}>
              <BarcodeScannerProvider>
                {!isGapsStore && <AppDrawer />}
                <Box
                  flex={1}
                  display="flex"
                  flexDirection="column"
                  overflow="hidden"
                >
                  {isGapsStore && <MobileNavBar />}
                  {!isGapsStore && <AppBar />}
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
                        path={RouteBuilder.create(AppRoute.Help)
                          .addWildCard()
                          .build()}
                        element={<Help />}
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
                            to={
                              isGapsStore && isAndroid
                                ? RouteBuilder.create(AppRoute.Coldchain)
                                    .addPart(AppRoute.Equipment)
                                    .build()
                                : RouteBuilder.create(
                                    AppRoute.Dashboard
                                  ).build()
                            }
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
        </SyncModalProvider>
      </EasterEggModalProvider>
    </RequireAuthentication>
  );
};
