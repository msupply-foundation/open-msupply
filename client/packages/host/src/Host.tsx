import React, { useEffect } from 'react';
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
  AuthProvider,
  EnvUtils,
  LocalStorage,
  AuthError,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  initialiseI18n,
  useInitialisationStatus,
  InitialisationStatusType,
  useAuthContext,
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { Viewport } from './components/Viewport';
import { MigrationInfoProvider } from './components/Migration';
import { ErrorAlert } from './components/ErrorAlert';
import { BackButtonHandler } from './BackButtonHandler';

const Login = React.lazy(() =>
  import('./components/Login').then(m => ({ default: m.Login }))
);
const Initialise = React.lazy(() =>
  import('./components/Initialise').then(m => ({ default: m.Initialise }))
);
const Discovery = React.lazy(() =>
  import('./components/Discovery').then(m => ({ default: m.Discovery }))
);
const Android = React.lazy(() =>
  import('./components/Android').then(m => ({ default: m.Android }))
);

const Site = React.lazy(() => import('./Site'));

import pkg from '../../../../package.json';
const appVersion = pkg.version;

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

const skipRequest = () =>
  LocalStorage.getItem('/error/auth') === AuthError.NoStoreAssigned;

const PreInit: React.FC = () => {
  const { logout } = useAuthContext();
  const data = useInitialisationStatus(false, true);

  // Query still loading — don't logout yet
  if (!data?.data) return null;

  if (data.data.status !== InitialisationStatusType.Initialised) {
    // Clear token
    logout();
  }

  return null;
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
                  element={
                    <React.Suspense fallback={<RandomLoader />}>
                      <Initialise />
                    </React.Suspense>
                  }
                />
                <Route
                  path={RouteBuilder.create(AppRoute.Login).build()}
                  element={
                    <React.Suspense fallback={<RandomLoader />}>
                      <Login />
                    </React.Suspense>
                  }
                />
                <Route
                  path={RouteBuilder.create(AppRoute.Discovery).build()}
                  element={
                    <React.Suspense fallback={<RandomLoader />}>
                      <Discovery />
                    </React.Suspense>
                  }
                />
                <Route
                  path={RouteBuilder.create(AppRoute.Android).build()}
                  element={
                    <React.Suspense fallback={<RandomLoader />}>
                      <Android />
                    </React.Suspense>
                  }
                />
                <Route
                  path="*"
                  element={
                    <React.Suspense fallback={<RandomLoader />}>
                      <Site />
                    </React.Suspense>
                  }
                />
              </Routes>
            </Box>
          </Viewport>
        </ErrorBoundary>
      }
    />
  )
);

initialiseI18n();

const Host = () => {
  useEffect(() => {
    // Defer Bugsnag init so it doesn't start a download during initial parse
    import('@bugsnag/js').then(({ default: Bugsnag }) => {
      Bugsnag.start({
        apiKey: 'a09ce9e95c27ac1b70ecf3c311e684ab',
        appVersion: appVersion,
        enabledBreadcrumbTypes: ['error'],
      });
    });

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
     * TO-DO: Once we have a proper "is Gaps Store" check, we can consolidate this
     * functionality and decide exactly what should be visible where, and under what
     * conditions.
     */
    EnvUtils.deviceInfo.then(info => {
      if (
        info.platform === 'android' &&
        (info.screen.width < 600 || info.screen.height < 600)
      ) {
        import('@capacitor/screen-orientation').then(({ ScreenOrientation }) => {
          ScreenOrientation.lock({ orientation: 'portrait' });
        });
      }
    });
  }, []);

  return (
  <React.Suspense fallback={<div />}>
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
                      <PreInit />
                      {/* eslint-disable-next-line camelcase */}
                      <RouterProvider router={router} future={{ v7_startTransition: true }} />
                    </AuthProvider>
                  </MigrationInfoProvider>
                  {/* <ReactQueryDevtools initialIsOpen /> */}
                </GqlProvider>
              </QueryClientProvider>
            </ErrorBoundary>
          </React.Suspense>
      </AppThemeProvider>
    </IntlProvider>
  </React.Suspense>
  );
};

export default Host;
