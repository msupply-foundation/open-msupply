import React, { FC } from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  AppFooterPortal,
  Box,
  AppThemeProvider,
  Typography,
  QueryClient,
  ReactQueryDevtools,
  QueryClientProvider,
  SnackbarProvider,
  RouteBuilder,
  ErrorBoundary,
  GenericErrorFallback,
  DetailPanel,
  AppFooter,
  OmSupplyApiProvider,
  IntlProvider,
  RandomLoader,
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { AppDrawer, AppBar, Viewport, NotFound, Footer } from './components';
import {
  DashboardRouter,
  DistributionRouter,
  CatalogueRouter,
  InventoryRouter,
  ReplenishmentRouter,
} from './routers';
import { Settings } from './Admin/Settings';
import { CommandK } from './CommandK';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const Heading: FC = ({ children }) => (
  <div style={{ margin: 50 }}>
    <Typography>[ Placeholder page: {children} ]</Typography>
  </div>
);

const Host: FC = () => (
  <React.Suspense fallback={<RandomLoader />}>
    <IntlProvider>
      <ErrorBoundary Fallback={GenericErrorFallback}>
        <QueryClientProvider client={queryClient}>
          <OmSupplyApiProvider url={Environment.API_URL}>
            <AppThemeProvider>
              <BrowserRouter>
                <CommandK>
                  <SnackbarProvider maxSnack={3}>
                    <Viewport>
                      <Box display="flex" style={{ minHeight: '100%' }}>
                        <AppDrawer />
                        <Box
                          flex={1}
                          display="flex"
                          flexDirection="column"
                          overflow="hidden"
                        >
                          <AppBar />
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
                                path={RouteBuilder.create(
                                  AppRoute.Replenishment
                                )
                                  .addWildCard()
                                  .build()}
                                element={<ReplenishmentRouter />}
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Suppliers)
                                  .addWildCard()
                                  .build()}
                                element={<Heading>suppliers</Heading>}
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Inventory)
                                  .addWildCard()
                                  .build()}
                                element={<InventoryRouter />}
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Tools)
                                  .addWildCard()
                                  .build()}
                                element={<Heading>tools</Heading>}
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Reports)
                                  .addWildCard()
                                  .build()}
                                element={<Heading>reports</Heading>}
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Messages)
                                  .addWildCard()
                                  .build()}
                                element={<Heading>messages</Heading>}
                              />

                              <Route
                                path={RouteBuilder.create(AppRoute.Admin)
                                  .addWildCard()
                                  .build()}
                                element={<Settings />}
                              />

                              <Route
                                path="/"
                                element={
                                  <Navigate
                                    replace
                                    to={RouteBuilder.create(
                                      AppRoute.Dashboard
                                    ).build()}
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
                      </Box>
                    </Viewport>
                  </SnackbarProvider>
                </CommandK>
              </BrowserRouter>
            </AppThemeProvider>
            <ReactQueryDevtools initialIsOpen />
          </OmSupplyApiProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </IntlProvider>
  </React.Suspense>
);

export default Host;
