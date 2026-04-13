/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useState, useEffect, FC } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import { useLocalStorage } from '../localStorage';
import { useLogin, useGetUserPermissions, useRefreshToken } from './api/hooks';
import { clearTokenExpiry } from './api/hooks/useRefreshToken';
import { AuthenticationResponse } from './api';
import { UserStoreNodeFragment } from './api/operations.generated';
import { PropsWithChildrenOnly, UserPermission } from '@common/types';
import { RouteBuilder } from '../utils/navigation';
import { matchPath } from 'react-router-dom';
import { createRegisteredContext } from 'react-singleton-context';
import { useUpdateUserInfo } from './hooks/useUpdateUserInfo';
import { useUserActivity } from './hooks/useUserActivity';

const TOKEN_CHECK_INTERVAL = 60 * 1000;
const AUTH_STATE_KEY = 'auth_state';

export enum AuthError {
  NoStoreAssigned = 'NoStoreAssigned',
  PermissionDenied = 'Forbidden',
  ServerError = 'ServerError',
  Unauthenticated = 'Unauthenticated',
  Timeout = 'Timeout',
}

export interface AuthState {
  store?: UserStoreNodeFragment;
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
  isAuthenticated: boolean;
  user?: User;
  userHasPermission: (permission: UserPermission) => boolean;
  updateUserIsLoading: boolean;
  lastSuccessfulSync?: string | null;
  updateUserError?: string | null;
  updateUser: () => Promise<void>;
}

/**
 * Persist auth state (user info, store) to localStorage.
 * The actual JWT is in an HttpOnly cookie — only metadata is stored here.
 */
const saveAuthState = (state: AuthState | undefined) => {
  if (state) {
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(AUTH_STATE_KEY);
  }
};

const loadAuthState = (): AuthState | undefined => {
  try {
    const stored = localStorage.getItem(AUTH_STATE_KEY);
    if (!stored) return undefined;
    return JSON.parse(stored) as AuthState;
  } catch {
    return undefined;
  }
};

const authControl = {
  isLoggingIn: false,
  login: (_username: string, _password: string) =>
    new Promise<AuthenticationResponse>(() => ({ token: 'token' })),
  logout: () => { },
  setStore: (_store: UserStoreNodeFragment) => new Promise<void>(() => ({})),
  storeId: 'store-id',
  isAuthenticated: false,
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
  const savedState = loadAuthState();
  const [authState, setAuthState] = useState<AuthState | undefined>(
    savedState
  );
  const [error, setError] = useLocalStorage('/error/auth');
  const storeId = authState?.store?.id ?? '';
  const {
    login,
    isLoggingIn,
    upsertMostRecentCredential,
    mostRecentCredentials,
  } = useLogin(setAuthState);
  const getUserPermissions = useGetUserPermissions();
  const { isActive } = useUserActivity();
  const { refreshToken } = useRefreshToken(() => {
    setAuthState(undefined);
    saveAuthState(undefined);
    clearTokenExpiry();
    setError(AuthError.Timeout);
  });

  const mostRecentUsername = mostRecentCredentials[0]?.username ?? undefined;

  // Persist auth state to localStorage whenever it changes
  useEffect(() => {
    saveAuthState(authState);
  }, [authState]);

  const setStore = async (store: UserStoreNodeFragment) => {
    if (!authState) return;

    upsertMostRecentCredential(mostRecentUsername ?? '', store);

    const permissions = await getUserPermissions(store);
    const user = {
      id: authState.user?.id ?? '',
      name: authState.user?.name ?? '',
      permissions,
      email: authState.user?.email,
      jobTitle: authState.user?.jobTitle,
    };
    setAuthState({ ...authState, store, user });
  };

  const {
    isLoading: updateUserIsLoading,
    lastSuccessfulSync,
    updateUser,
    error: updateUserError,
  } = useUpdateUserInfo(setAuthState, authState, mostRecentCredentials);

  const logout = () => {
    setError(undefined);
    setAuthState(undefined);
    saveAuthState(undefined);
    clearTokenExpiry();
  };

  const userHasPermission = (permission: UserPermission) =>
    authState?.user?.permissions.some(p => p === permission) || false;

  const val = useMemo(
    () => ({
      error,
      isLoggingIn,
      login,
      logout,
      storeId,
      isAuthenticated: !!authState,
      user: authState?.user,
      store: authState?.store,
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
      authState,
      error,
      mostRecentUsername,
      isLoggingIn,
      setStore,
      setError,
      userHasPermission,
    ]
  );

  useEffect(() => {
    // check every minute for a valid session
    const timer = window.setInterval(() => {
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

      if (!authState) {
        setError(AuthError.Timeout);
        window.clearInterval(timer);
        return;
      }

      if (isActive()) {
        refreshToken();
      }
    }, TOKEN_CHECK_INTERVAL);
    return () => window.clearInterval(timer);
  }, [authState, isActive, refreshToken, setError]);

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
