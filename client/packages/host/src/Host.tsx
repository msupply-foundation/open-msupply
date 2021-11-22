import React, { FC } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import {
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
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useDrawer,
  styled,
  DetailPanel,
  AppFooter,
  OmSupplyApiProvider,
  IntlProvider,
  Biker,
  BasicSpinner,
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import {
  AppDrawer,
  AppBar,
  Viewport,
  NotFound,
  LanguageMenu,
  Footer,
} from './components';
import {
  DashboardRouter,
  DistributionRouter,
  CatalogueRouter,
  ReplenishmentRouter,
} from './routers';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const Heading: FC = ({ children }) => (
  <div style={{ margin: 50 }}>
    <Typography>[ Placeholder page: {children} ]</Typography>
  </div>
);

const CustomKBarSearch = styled(KBarSearch)(({ theme }) => ({
  width: 500,
  height: 50,
  fontSize: 20,
  backgroundColor: theme.palette.primary.main,
  borderRadius: '5px',
  ':focus-visible': {
    outline: 'none',
  },
}));

const CustomKBarResults = styled(KBarResults)({
  width: 500,
  fontSize: 16,
  borderRadius: '5px',
  boxShadow: '0px 6px 20px rgb(0 0 0 / 20%)',
  ':focus-visible': {
    outline: 'none',
  },
});

const CommandK: FC = ({ children }) => {
  const navigate = useNavigate();
  const drawer = useDrawer();

  const actions = [
    {
      id: 'Navigate',
      section: 'This is a subtitle hehe',
      name: 'Navigation actions',
      shortcut: ['c'],
      keywords: 'navigation, back',
      children: ['navigation:go-back', 'navigation:outbound-shipment'],
    },

    {
      id: 'navigation:go-back',
      name: 'Go back',
      shortcut: ['c'],
      keywords: 'navigation, back',
      perform: () => navigate(-1),
    },
    {
      id: 'navigation-drawer:close-drawer',
      name: 'Navigation Drawer: Close',
      shortcut: ['c'],
      keywords: 'drawer, close',
      perform: () => drawer.close(),
    },
    {
      id: 'navigation-drawer:open-drawer',
      name: 'Navigation Drawer: Open',
      shortcut: ['o'],
      keywords: 'drawer, open',
      perform: () => drawer.open(),
    },
    {
      id: 'navigation:outbound-shipment',
      name: 'Go to: Outbound Shipments',
      shortcut: ['c'],
      keywords: 'shipment',
      perform: () =>
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.OutboundShipment)
            .build()
        ),
    },
    {
      id: 'navigation:outbound-shipment/new',
      name: 'Create: New Outbound Shipment',
      shortcut: ['o'],
      keywords: 'distribution',
      perform: () => navigate('/distribution/outbound-shipment/new'),
    },
    {
      id: 'navigation:dashboard',
      name: 'Go to: Dashboard',
      shortcut: ['d'],
      keywords: 'dashboard',
      perform: () => navigate('/dashboard'),
    },
    {
      id: 'navigation:customer-requisition',
      name: 'Go to: Customer Requisition',
      shortcut: ['r'],
      keywords: 'distribution',
      perform: () => navigate('/distribution/customer-requisition'),
    },
    {
      id: 'navigation:reports',
      name: 'Go to: Reports',
      shortcut: ['r'],
      keywords: 'reports',
      perform: () => navigate('/reports'),
    },
  ];

  return (
    <KBarProvider actions={actions}>
      <KBarPortal>
        <KBarPositioner>
          <KBarAnimator
            style={{
              boxShadow: '0px 6px 20px rgb(0 0 0 / 20%)',
            }}
          >
            <CustomKBarSearch placeholder="Type a command or search" />
            <CustomKBarResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  );
};

const Host: FC = () => (
  <React.Suspense fallback={<Biker />}>
    <IntlProvider>
      <ErrorBoundary Fallback={GenericErrorFallback}>
        <QueryClientProvider client={queryClient}>
          <OmSupplyApiProvider url={Environment.API_URL}>
            <AppThemeProvider>
              <BrowserRouter>
                <CommandK>
                  <SnackbarProvider maxSnack={3}>
                    <Viewport>
                      <Box display="flex" height="100%">
                        <AppDrawer />
                        <Box
                          flex={1}
                          display="flex"
                          flexDirection="column"
                          overflow="hidden"
                        >
                          <AppBar />
                          <Box display="flex" flex={1} overflow="scroll">
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
                                path={RouteBuilder.create(AppRoute.Stock)
                                  .addWildCard()
                                  .build()}
                                element={<Heading>stock</Heading>}
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
                                element={<LanguageMenu />}
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
