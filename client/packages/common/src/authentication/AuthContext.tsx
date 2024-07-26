/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useState, useEffect, FC } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import { useLocalStorage } from '../localStorage';
import Cookies from 'js-cookie';
import { addMinutes } from 'date-fns/addMinutes';
import { useLogin, useGetUserPermissions, useRefreshToken } from './api/hooks';

import { AuthenticationResponse } from './api';
import { UserStoreNodeFragment } from './api/operations.generated';
import { PropsWithChildrenOnly, UserPermission } from '@common/types';
import { RouteBuilder } from '../utils/navigation';
import { matchPath } from 'react-router-dom';
import { useGql } from '../api';
import { createRegisteredContext } from 'react-singleton-context';
import { useUpdateUserInfo } from './hooks/useUpdateUserInfo';

// Also determines auth cookie lifetime
export const INACTIVITY_TIMEOUT_MINUTES = 60;
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
  error?: AuthError | null;
  isLoggingIn: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<AuthenticationResponse>;
  logout: () => void;
  mostRecentUsername?: string;
  setError?: (error: AuthError) => void;
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
  const expires = addMinutes(new Date(), INACTIVITY_TIMEOUT_MINUTES);
  const authCookie = { ...cookie, expires };

  Cookies.set('auth', JSON.stringify(authCookie), { expires });
};

const authControl = {
  isLoggingIn: false,
  login: (_username: string, _password: string) =>
    new Promise<AuthenticationResponse>(() => ({ token: 'token' })),
  logout: () => {},
  setStore: (_store: UserStoreNodeFragment) => new Promise<void>(() => ({})),
  storeId: 'store-id',
  token: '',
  userHasPermission: (_permission: UserPermission) => false,
  updateUserIsLoading: false,
  updateUser: () => new Promise<void>(() => {}),
};

const AuthContext = createRegisteredContext<AuthControl>(
  'auth-context',
  authControl
);
const { Provider } = AuthContext;

export const AuthProvider: FC<PropsWithChildrenOnly> = ({ children }) => {
  const authCookie = getAuthCookie();
  const [cookie, setCookie] = useState<AuthCookie | undefined>(authCookie);
  const [error, setError] = useLocalStorage('/error/auth');
  const storeId = cookie?.store?.id ?? '';
  const {
    login,
    isLoggingIn,
    upsertMostRecentCredential,
    mostRecentCredentials,
  } = useLogin(setCookie);
  const getUserPermissions = useGetUserPermissions();
  const { refreshToken } = useRefreshToken(() => {
    Cookies.remove('auth');
    setCookie(undefined);
    setError(AuthError.Timeout);
  });
  const { setHeader } = useGql();
  const mostRecentUsername = mostRecentCredentials[0]?.username ?? undefined;
  // initialise the auth header with the cookie value i.e. on page refresh
  setHeader('Authorization', `Bearer ${authCookie?.token}`);
  const setStore = async (store: UserStoreNodeFragment) => {
    if (!cookie?.token) return;

    upsertMostRecentCredential(mostRecentUsername ?? '', store);

    const permissions = await getUserPermissions(cookie?.token, store);
    const user = {
      id: cookie.user?.id ?? '',
      name: cookie.user?.name ?? '',
      permissions,
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
    setError(undefined);
    setCookie(undefined);
  };

  const userHasPermission = (permission: UserPermission) =>
    cookie?.user?.permissions.some(p => p === permission) || false;

  const val = useMemo(
    () => ({
      error,
      isLoggingIn,
      login,
      logout,
      storeId,
      token: cookie?.token || '',
      user: cookie?.user,
      store: cookie?.store,
      mostRecentUsername,
      setStore,
      setError,
      userHasPermission,
      updateUserIsLoading,
      lastSuccessfulSync,
      updateUserError,
      updateUser,
    }),
    [
      login,
      cookie,
      error,
      mostRecentUsername,
      isLoggingIn,
      setStore,
      setError,
      userHasPermission,
    ]
  );

  useEffect(() => {
    // check every minute for a valid token
    // if the cookie has expired, raise an auth error
    const timer = window.setInterval(() => {
      const authCookie = getAuthCookie();
      const { token } = authCookie;
      const isInitScreen = matchPath(
        RouteBuilder.create(AppRoute.Initialise).addWildCard().build(),
        location.pathname
      );

      const isDiscoveryScreen = matchPath(
        RouteBuilder.create(AppRoute.Discovery).addWildCard().build(),
        location.pathname
      );

      const isNotAuthPath = isDiscoveryScreen || isInitScreen;
      if (isNotAuthPath) return;

      if (!token) {
        setError(AuthError.Timeout);
        window.clearInterval(timer);
        return;
      }

      refreshToken();
    }, TOKEN_CHECK_INTERVAL);
    return () => window.clearInterval(timer);
  }, [cookie?.token]);

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
