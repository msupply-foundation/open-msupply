/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useState, useEffect, FC } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import Cookies from 'js-cookie';
import { addMinutes } from 'date-fns/addMinutes';
import { useLogin, useGetUserPermissions, useRefreshToken } from './api/hooks';
import { isAuthRequest } from './api/hooks/useLogin';
import { AuthenticationResponse } from './api';
import { useAuthApi } from './api/hooks/useAuthApi';
import { UnauthenticatedError } from '../api/GqlContext';
import { useGql } from '../api/GqlContext';
import { UserStoreNodeFragment } from './api/operations.generated';
import { PropsWithChildrenOnly, UserPermission } from '@common/types';
import { RouteBuilder } from '../utils/navigation';
import { matchPath } from 'react-router-dom';
import { createRegisteredContext } from 'react-singleton-context';
import { useUpdateUserInfo } from './hooks/useUpdateUserInfo';
import { useUserActivity } from './hooks/useUserActivity';
import { useAuthOverlay } from './AuthOverlay';

const AUTH_TOKEN_LIFETIME_MINUTES = 60;
const TOKEN_CHECK_INTERVAL = 60 * 1000;

export enum AuthError {
  NoStoreAssigned = 'NoStoreAssigned',
  PermissionDenied = 'Forbidden',
  ServerError = 'ServerError',
  Unauthenticated = 'Unauthenticated',
  Timeout = 'Timeout',
}

export interface AuthCookie {
  expires?: Date;
  store?: UserStoreNodeFragment;
  token: string;
  user?: User;
}

type User = {
  id: string;
  name: string;
  permissions: UserPermission[];
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  jobTitle?: string | null;
};

interface AuthControl {
  isLoggingIn: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<AuthenticationResponse>;
  logout: () => void;
  mostRecentUsername?: string;
  setStore: (store: UserStoreNodeFragment) => Promise<void>;
  store?: UserStoreNodeFragment;
  storeId: string;
  token: string;
  user?: User;
  userHasPermission: (permission: UserPermission) => boolean;
  updateUserIsLoading: boolean;
  lastSuccessfulSync?: string | null;
  updateUserError?: string | null;
  updateUser: () => Promise<void>;
}

export const getAuthCookie = (): AuthCookie => {
  const authString = Cookies.get('auth');
  const emptyCookie = { token: '' };
  if (!!authString) {
    try {
      const parsed = JSON.parse(authString) as AuthCookie;
      return parsed;
    } catch {
      return emptyCookie;
    }
  }
  return emptyCookie;
};

export const setAuthCookie = (cookie: AuthCookie) => {
  const expires = addMinutes(new Date(), AUTH_TOKEN_LIFETIME_MINUTES); // Decide when to refresh
  const authCookie = { ...cookie, expires };

  Cookies.set('auth', JSON.stringify(authCookie), { expires });
};

const authControl = {
  isLoggingIn: false,
  login: (_username: string, _password: string) =>
    new Promise<AuthenticationResponse>(() => ({ token: 'token' })),
  logout: () => { },
  setStore: (_store: UserStoreNodeFragment) => new Promise<void>(() => ({})),
  storeId: 'store-id',
  token: '',
  userHasPermission: (_permission: UserPermission) => false,
  updateUserIsLoading: false,
  updateUser: () => new Promise<void>(() => { }),
};

const AuthContext = createRegisteredContext<AuthControl>(
  'auth-context',
  authControl
);
const { Provider } = AuthContext;

export const AuthProvider: FC<PropsWithChildrenOnly> = ({ children }) => {
  const authCookie = getAuthCookie();
  const [cookie, setCookie] = useState<AuthCookie | undefined>(authCookie);
  const { show: showAuthOverlay } = useAuthOverlay();
  const { sdk } = useAuthApi();
  const { setSkipRequest } = useGql();
  // If we boot with a cookie, the token may belong to a user that no longer
  // exists (e.g. the DB was re-initialised). Validate it before letting any
  // child render — otherwise downstream startup queries fire authed requests
  // against a stale cookie and pop the re-auth overlay on cold load.
  // Network failures don't invalidate the cookie; they're handled by the
  // global connection banner and per-query retries instead.
  const [isValidatingCookie, setIsValidatingCookie] = useState(
    !!authCookie.token
  );
  const storeId = cookie?.store?.id ?? '';
  const {
    login,
    isLoggingIn,
    upsertMostRecentCredential,
    mostRecentCredentials,
  } = useLogin(setCookie);
  const getUserPermissions = useGetUserPermissions();
  const { isActive } = useUserActivity();
  const { refreshToken } = useRefreshToken(
    () => {
      Cookies.remove('auth');
      setCookie(undefined);
      showAuthOverlay('expired');
    },
  );

  const mostRecentUsername = mostRecentCredentials[0]?.username ?? undefined;

  const setStore = async (store: UserStoreNodeFragment) => {
    if (!cookie?.token) return;

    upsertMostRecentCredential(mostRecentUsername ?? '', store);

    const permissions = await getUserPermissions(cookie?.token, store);
    const user = {
      id: cookie.user?.id ?? '',
      name: cookie.user?.name ?? '',
      permissions,
      email: cookie.user?.email,
      jobTitle: cookie.user?.jobTitle,
    };
    const newCookie = { ...cookie, store, user };
    setAuthCookie(newCookie);
    setCookie(newCookie);
  };

  const {
    isLoading: updateUserIsLoading,
    lastSuccessfulSync,
    updateUser,
    error: updateUserError,
  } = useUpdateUserInfo(setCookie, cookie, mostRecentCredentials);

  const logout = () => {
    Cookies.remove('auth');
    setCookie(undefined);
  };

  const userHasPermission = (permission: UserPermission) =>
    cookie?.user?.permissions.some(p => p === permission) || false;

  const val = useMemo(
    () => ({
      isLoggingIn,
      login,
      logout,
      storeId,
      token: cookie?.token || '',
      user: cookie?.user,
      store: cookie?.store,
      mostRecentUsername,
      setStore,
      userHasPermission,
      updateUserIsLoading,
      lastSuccessfulSync,
      updateUserError,
      updateUser,
    }),
    [
      login,
      cookie,
      mostRecentUsername,
      isLoggingIn,
      setStore,
      userHasPermission,
    ]
  );

  // Suppress non-auth queries when the user is logged in but has no
  // valid store assigned. Replaces the old `/error/auth = NoStoreAssigned`
  // localStorage gate.
  useEffect(() => {
    setSkipRequest(documentNode => {
      if (!cookie?.token) return false;
      if (cookie?.store?.id) return false;
      return !documentNode.definitions.some(isAuthRequest);
    });
  }, [cookie?.token, cookie?.store?.id, setSkipRequest]);

  useEffect(() => {
    if (!isValidatingCookie) return;
    let cancelled = false;
    sdk
      .me({}, { Authorization: `Bearer ${authCookie.token}` })
      .then(() => {
        if (!cancelled) setIsValidatingCookie(false);
      })
      .catch(e => {
        if (cancelled) return;
        if (e instanceof UnauthenticatedError) {
          Cookies.remove('auth');
          setCookie(undefined);
        }
        // Network or other failures — leave the cookie alone and let the
        // user proceed; the connection banner and per-query retries cover
        // transport problems.
        setIsValidatingCookie(false);
      });
    return () => {
      cancelled = true;
    };
    // Mount-only — we're validating the cookie that was present at boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // check every minute for a valid token
    // if the cookie has expired, raise an auth error
    const timer = window.setInterval(() => {
      const authCookie = getAuthCookie();
      const { token } = authCookie;
      // Routes where being unauthenticated is the expected state — don't
      // try to interpret the absence of a token as a session expiry.
      const isPublicRoute = [
        AppRoute.Login,
        AppRoute.Initialise,
        AppRoute.Discovery,
        AppRoute.Android,
      ].some(route =>
        matchPath(
          RouteBuilder.create(route).addWildCard().build(),
          location.pathname
        )
      );
      if (isPublicRoute) return;

      if (!token) {
        showAuthOverlay('expired');
        window.clearInterval(timer);
        return;
      }

      if (isActive()) {
        refreshToken();
      }
    }, TOKEN_CHECK_INTERVAL);
    return () => window.clearInterval(timer);
  }, [cookie?.token, isActive, refreshToken, showAuthOverlay]);

  if (isValidatingCookie) return null;

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
