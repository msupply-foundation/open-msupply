import React, { useEffect } from 'react';
import Bugsnag from '@bugsnag/js';
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
  AuthOverlayProvider,
  BadUserInputError,
  InternalServerError,
  NetworkError,
  PermissionDeniedError,
  UnauthenticatedError,
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
import { MigrationInfoProvider } from './components/Migration';
import { Site } from './Site';
import { ErrorAlert } from './components/ErrorAlert';
import { ConnectionLostBanner } from './components/ConnectionLostBanner';
import { AuthOverlayModal } from './components/AuthOverlayModal';
import { Discovery } from './components/Discovery';
import { Android } from './components/Android';
import { BackButtonHandler } from './BackButtonHandler';
import { useInitPlugins } from './useInitPlugins';
import { ScreenOrientation } from '@capacitor/screen-orientation';

const appVersion = require('../../../../package.json').version; // eslint-disable-line @typescript-eslint/no-var-requires

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // These are disabled during development because they're
      // annoying to have constantly refetching.
      refetchOnWindowFocus: EnvUtils.isProduction(),
      // Only retry transport failures; auth/permission/internal errors
      // won't change on a retry, and the user is waiting.
      retry: (failureCount, error) =>
        error instanceof NetworkError && failureCount < 3,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000),
      // Suspense queries (usePreferences, useMigrationStatus, etc.) throw
      // errors during render unless this is set, which would trip the
      // global ErrorBoundary. Every typed GraphQL error is already
      // surfaced elsewhere — network by the connection banner, auth by
      // the AuthOverlay, permission/internal/bad-input by toasts in
      // QueryErrorHandler — so none of them should escalate. The error
      // boundary stays as a backstop for genuinely unexpected throws.
      useErrorBoundary: error =>
        !(
          error instanceof NetworkError ||
          error instanceof UnauthenticatedError ||
          error instanceof PermissionDeniedError ||
          error instanceof BadUserInputError ||
          error instanceof InternalServerError
        ),
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

const PreInit: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { logout } = useAuthContext();
  const data = useInitialisationStatus(false, true);
  const status = data?.data?.status;

  // The server reporting anything other than Initialised means any cached
  // auth cookie from a previous DB is stale. Clear it so authed queries
  // (e.g. usePreferences, gated by `enabled: !!storeId`) stop firing while
  // the user is on the init flow. Render-time side effects are unsafe, so
  // do it in an effect that fires on status transitions.
  useEffect(() => {
    if (status && status !== InitialisationStatusType.Initialised) {
      logout();
    }
  }, [status, logout]);

  if (!status) return null;
  if (status !== InitialisationStatusType.Initialised) return null;
  return children;
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
            <ConnectionLostBanner />
            <ErrorAlert />
            <AuthOverlayModal />
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
                <GqlProvider url={Environment.GRAPHQL_URL}>
                  <MigrationInfoProvider>
                    <AuthOverlayProvider>
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
                    </AuthOverlayProvider>
                  </MigrationInfoProvider>
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
