import React, { FC } from 'react';
import {
  AppFooterPortal,
  Box,
  AppThemeProvider,
  Typography,
  QueryClient,
  ReactQueryDevtools,
  QueryClientProvider,
  IntlProvider,
  SnackbarProvider,
  useHostContext,
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
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import AppDrawer from './AppDrawer';
import AppBar from './AppBar';
import { LanguageMenu } from './LanguageMenu';
import Viewport from './Viewport';
import NotFound from './NotFound';
import { Footer } from './Footer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const DistributionContainer = React.lazy(
  () => import('@openmsupply-client/distribution/src/DistributionContainer')
);
const DashboardService = React.lazy(
  () => import('@openmsupply-client/dashboard/src/DashboardService')
);

const CatalogueContainer = React.lazy(
  () => import('@openmsupply-client/catalogue/src/Container')
);

const Heading: FC<{ locale: string }> = props => (
  <div style={{ margin: 50 }}>
    <Typography>[ Placeholder page: {props.children} ]</Typography>
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

const Host: FC = () => {
  const { locale } = useHostContext();

  return (
    <IntlProvider locale={locale}>
      <ErrorBoundary Fallback={GenericErrorFallback}>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <BrowserRouter>
              <CommandK>
                <SnackbarProvider maxSnack={3}>
                  <Viewport>
                    <Box display="flex">
                      <AppDrawer />
                      <Box flex={1} display="flex" flexDirection="column">
                        <AppBar />
                        <Box display="flex" flex={1}>
                          <React.Suspense fallback={'Loading'}>
                            <Routes>
                              <Route
                                path={RouteBuilder.create(AppRoute.Dashboard)
                                  .addWildCard()
                                  .build()}
                                element={<DashboardService />}
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Catalogue)
                                  .addWildCard()
                                  .build()}
                                element={<CatalogueContainer />}
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Distribution)
                                  .addWildCard()
                                  .build()}
                                element={<DistributionContainer />}
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Suppliers)
                                  .addWildCard()
                                  .build()}
                                element={
                                  <Heading locale={locale}>suppliers</Heading>
                                }
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Stock)
                                  .addWildCard()
                                  .build()}
                                element={
                                  <Heading locale={locale}>stock</Heading>
                                }
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Tools)
                                  .addWildCard()
                                  .build()}
                                element={
                                  <Heading locale={locale}>tools</Heading>
                                }
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Reports)
                                  .addWildCard()
                                  .build()}
                                element={
                                  <Heading locale={locale}>reports</Heading>
                                }
                              />
                              <Route
                                path={RouteBuilder.create(AppRoute.Messages)
                                  .addWildCard()
                                  .build()}
                                element={
                                  <Heading locale={locale}>messages</Heading>
                                }
                              />

                              <Route
                                path={RouteBuilder.create(AppRoute.Admin)
                                  .addWildCard()
                                  .build()}
                                element={<LanguageMenu />}
                              />

                              <Route path="/" element={<DashboardService />} />

                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </React.Suspense>
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
        </QueryClientProvider>
      </ErrorBoundary>
    </IntlProvider>
  );
};

export default Host;
