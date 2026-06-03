import React from 'react';
import Bugsnag from '@bugsnag/js';
import {
  Routes,
  Route,
  Box,
  AppThemeProvider,
  QueryClient,
  QueryClientProvider,
  RouteBuilder,
  ErrorBoundary,
  GenericErrorFallback,
  GqlProvider,
  IntlProvider,
  RandomLoader,
  ConfirmationModalProvider,
  AuthProvider,
  AlertModalProvider,
  EnvUtils,
  LocalStorage,
  AuthError,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  initialiseI18n,
  usePreferences,
  useIsCentralServerApi,
  useInitialisationStatus,
  InitialisationStatusType,
  useAuthContext,
} from '@openmsupply-client/common';

import { KBarProvider } from 'kbar';
// import { ReactQueryDevtools } from 'react-query/devtools';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { Initialise, Login, Viewport } from './components';
import { MigrationInfoProvider } from './components/Migration';
// Lazy: `Site` is the authenticated app shell — it sync-imports every
// router (Distribution, Dispensary, Inventory, Manage, Programs, …),
// AppDrawer, Footer, Help, MobileNavBar, SyncModalProvider, and so on.
// Keeping that whole tree out of the initial bundle means the /login,
// /initialise, /discovery, /android routes don't pay for it.
const Site = React.lazy(() =>
  import('./Site').then(m => ({ default: m.Site }))
);
import { ErrorAlert } from './components/ErrorAlert';
import { Discovery } from './components/Discovery';
import { Android } from './components/Android';
import { BackButtonHandler } from './BackButtonHandler';
import { useInitPlugins } from './useInitPlugins';
import { ScreenOrientation } from '@capacitor/screen-orientation';

const appVersion = require('../../../../package.json').version; // eslint-disable-line @typescript-eslint/no-var-requires

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Creates unnecessary requests
      refetchOnWindowFocus: false,
    },
  },
});

// Top-level side effects (Bugsnag.start, ScreenOrientation.lock,
// initialiseI18n) are pulled out into this helper so the module itself
// stays side-effect-free from webpack's perspective. That keeps the
// `sideEffects: false` contract intact and lets tree-shaking drop
// anything unreachable from the entry point. The helper runs exactly
// once when <Host /> mounts.
let _bootstrapped = false;
const runOneTimeStartup = () => {
  if (_bootstrapped) return;
  _bootstrapped = true;

  Bugsnag.start({
    apiKey: 'a09ce9e95c27ac1b70ecf3c311e684ab',
    appVersion: appVersion,
    enabledBreadcrumbTypes: ['error'],
  });

  initialiseI18n();

  // Lock portrait orientation on small Android devices. See the original
  // comment below this function for context.
  EnvUtils.deviceInfo.then(info => {
    if (
      info.platform === 'android' &&
      (info.screen.width < 600 || info.screen.height < 600)
    ) {
      ScreenOrientation.lock({ orientation: 'portrait' });
    }
  });
};

const skipRequest = () =>
  LocalStorage.getItem('/error/auth') === AuthError.NoStoreAssigned;

const PreInit: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { logout } = useAuthContext();
  const data = useInitialisationStatus(false);

  // Query still loading — don't render children yet, but don't logout either
  if (!data?.data) return null;

  if (data.data.status == InitialisationStatusType.Initialised)
    return children;

  // Server is not initialised — clear token
  logout();

  return null;
};

/**
 * Empty component which can be used to call startup hooks.
 * For example, this component is called when auth information such as user or store id changed.
 */
const Init = () => {
  useInitPlugins();
  usePreferences(); // Ensure preferences are loaded on startup - they'll be cached indefinitely
  useIsCentralServerApi();
  return <></>;
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      path="*"
      element={
        // Now need to apply additional error boundary inside the router
        <ErrorBoundary Fallback={GenericErrorFallback}>
          <Viewport>
            <ErrorAlert />
            <BackButtonHandler />
            <Box display="flex" style={{ minHeight: '100%' }}>
              <Routes>
                <Route
                  path={RouteBuilder.create(AppRoute.Initialise).build()}
                  element={<Initialise />}
                />
                <Route
                  path={RouteBuilder.create(AppRoute.Login).build()}
                  element={<Login />}
                />
                <Route
                  path={RouteBuilder.create(AppRoute.Discovery).build()}
                  element={<Discovery />}
                />
                <Route
                  path={RouteBuilder.create(AppRoute.Android).build()}
                  element={<Android />}
                />
                <Route path="*" element={<Site />} />
              </Routes>
            </Box>
          </Viewport>
        </ErrorBoundary>
      }
    />
  )
);

const Host = () => {
  runOneTimeStartup();
  return (
  <React.Suspense fallback={<div />}>
    <KBarProvider actions={[]}>
      <IntlProvider>
        <AppThemeProvider>
          <React.Suspense fallback={<RandomLoader />}>
            <ErrorBoundary Fallback={GenericErrorFallback}>
              <QueryClientProvider client={queryClient}>
                <GqlProvider
                  url={Environment.GRAPHQL_URL}
                  skipRequest={skipRequest}
                >
                  <MigrationInfoProvider>
                    <AuthProvider>
                      <PreInit>
                        <Init />
                      </PreInit>
                      <ConfirmationModalProvider>
                        <AlertModalProvider>
                          <RouterProvider router={router} />
                        </AlertModalProvider>
                      </ConfirmationModalProvider>
                    </AuthProvider>
                  </MigrationInfoProvider>
                  {/* <ReactQueryDevtools initialIsOpen={false} /> */}
                </GqlProvider>
              </QueryClientProvider>
            </ErrorBoundary>
          </React.Suspense>
        </AppThemeProvider>
      </IntlProvider>
    </KBarProvider>
  </React.Suspense>
  );
};

export default Host;
