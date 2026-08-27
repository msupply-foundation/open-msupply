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
  AlertModalProvider,
  EnvUtils,
  LocalStorage,
  AuthError,
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  RouterProvider,
  initialiseI18n,
  KBarProvider,
  usePreferences,
  useIsCentralServerApi,
  useInitialisationStatus,
  InitialisationStatusType,
  clearAuthState,
} from '@openmsupply-client/common';
// import { ReactQueryDevtools } from 'react-query/devtools';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { Initialise, Login, Viewport } from './components';
import { MigrationInfoProvider } from './components/Migration';
import { Site } from './Site';
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

Bugsnag.start({
  apiKey: 'a09ce9e95c27ac1b70ecf3c311e684ab',
  appVersion: appVersion,
  enabledBreadcrumbTypes: ['error'],
});

const skipRequest = () =>
  LocalStorage.getItem('/error/auth') === AuthError.NoStoreAssigned;

const PreInit: React.FC<React.PropsWithChildren> = ({ children }) => {
  const data = useInitialisationStatus(false);

  // Query still loading — don't render children yet, but don't logout either
  if (!data?.data) return null;

  if (data.data.status == InitialisationStatusType.Initialised) return children;

  // Server is not initialised — wipe locally cached auth so the route guard sends the user to
  // /login. Skip the server-side logout: PreInit renders outside the Router (so useNavigate is
  // unavailable) and the server isn't initialised anyway, so the request would just error.
  clearAuthState();

  return null;
};

/**
 * Guards the /login route while the server is still uninitialised.
 *
 * Until initialisation completes the server only serves the reduced
 * `InitialisationQueries` schema — there is no `me` field and no `UserStoreNode` type — so
 * Login's mount-time `logout()` fails schema validation and arms the ServerError alert.
 *
 * Redirecting *before* Login can mount matters as much as the redirect itself. Letting it
 * mount and bounce itself away via useLoginForm raced `useLogout`'s post-await navigate back
 * to /login, and the two redirects chased each other indefinitely. Each lap remounted the
 * Initialise form, whose username field re-fired its `autoFocus`, so the Android soft keyboard
 * flapped open/closed several times a second on the initialisation screen.
 */
const RequireInitialised: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const { data } = useInitialisationStatus();

  // Status unknown — render nothing rather than guessing; a wrong guess either flashes the
  // login form or bounces a legitimate login attempt.
  if (!data) return null;

  if (data.status !== InitialisationStatusType.Initialised)
    return <Navigate to={`/${AppRoute.Initialise}`} replace />;

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

// Router base path derived from the build-time publicPath ('/' by default, so
// no basename in the default build). React Router expects it without a trailing
// slash, so strip it for anything other than the root.
const basename =
  Environment.PUBLIC_PATH === '/'
    ? undefined
    : Environment.PUBLIC_PATH.replace(/\/$/, '');

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
                  element={
                    <RequireInitialised>
                      <Login />
                    </RequireInitialised>
                  }
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
  ),
  { basename }
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
                  <MigrationInfoProvider>
                    <PreInit>
                      <Init />
                    </PreInit>
                    <ConfirmationModalProvider>
                      <AlertModalProvider>
                        <RouterProvider router={router} />
                      </AlertModalProvider>
                    </ConfirmationModalProvider>
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

export default Host;
