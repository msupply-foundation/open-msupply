import React from 'react';
import Bugsnag from '@bugsnag/js';
// Import large library to test bundle size increase
import * as lodash from 'lodash';
import {
  Routes,
  Route,
  Box,
  AppThemeProvider,
  QueryClient,
  // ReactQueryDevtools,
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
  KBarProvider,
  usePreferences,
  useIsCentralServerApi,
  useInitialisationStatus,
  InitialisationStatusType,
  useAuthContext,
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { Initialise, Login, Viewport } from './components';
import { Site } from './Site';
import { ErrorAlert } from './components/ErrorAlert';
import { Discovery } from './components/Discovery';
import { Android } from './components/Android';
import { BackButtonHandler } from './BackButtonHandler';
import { useInitPlugins } from './useInitPlugins';
import { ScreenOrientation } from '@capacitor/screen-orientation';

const appVersion = require('../../../../package.json').version; // eslint-disable-line @typescript-eslint/no-var-requires

// Test bundle size increase - using lodash to trigger significant bundle change
const testBundleSize = lodash.debounce(() => console.log('test'), 1000);
testBundleSize();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // These are disabled during development because they're
      // annoying to have constantly refetching.
      refetchOnWindowFocus: EnvUtils.isProduction(),
      retry: EnvUtils.isProduction(),
      // This is the default in v4 which is currently in alpha as it is
      // what most users think the default is.
      // This will subscribe components of a query only to the data they
      // destructure. I.e. if the component does not read the isLoading
      // field, the component will not re-render when the state changes.
      notifyOnChangeProps: 'tracked',
    },
  },
});

Bugsnag.start({
  apiKey: 'a09ce9e95c27ac1b70ecf3c311e684ab',
  appVersion: appVersion,
  enabledBreadcrumbTypes: ['error'],
});

const skipRequest = () =>
  LocalStorage.getItem('/error/auth') === AuthError.NoStoreAssigned;

const PreInit: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { logout } = useAuthContext();
  const data = useInitialisationStatus(false, true);

  // Technically this should not fire before query is loaded because we are doing suspense
  if (data?.data?.status == InitialisationStatusType.Initialised)
    return children;

  // Clear token
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

/**
 * If app is being used on an Android phone, we lock the screen to "Portrait"
 * mode, as the UI will be restricted to GAPS functionality only, which is
 * optimised for mobile portrait mode.
 *
 * We can't use the existing screen size hooks, as they only consider screen
 * width, but we need to check both width and height (as we don't know what
 * orientation the device is in on launch)
 *
 * The 600px here corresponds to the "sm" breakpoint in the theme, which is used
 * to determine if the device is a phone or not.
 *
 * Including here, outside the component functions, as this is a one-time check
 * at startup.
 *
 * TO-DO: Once we have a proper "is Gaps Store" check, we can consolidate this
 * functionality and decide exactly what should be visible where, and under what
 * conditions.
 */
EnvUtils.deviceInfo.then(info => {
  if (
    info.platform === 'android' &&
    (info.screen.width < 600 || info.screen.height < 600)
  ) {
    ScreenOrientation.lock({
      orientation: 'portrait',
    });
  }
});

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

initialiseI18n();

const Host = () => (
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
                  {/* <ReactQueryDevtools initialIsOpen /> */}
                </GqlProvider>
              </QueryClientProvider>
            </ErrorBoundary>
          </React.Suspense>
        </AppThemeProvider>
      </IntlProvider>
    </KBarProvider>
  </React.Suspense>
);

export default Host;
