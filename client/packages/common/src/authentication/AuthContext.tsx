import React, { useMemo, useState, FC } from 'react';
import { useLocalStorage } from '../localStorage';
import { useLogin, useGetUserPermissions } from './api/hooks';
import { AuthenticationResponse } from './api';
import { UserStoreNodeFragment } from './api/operations.generated';
import { PropsWithChildrenOnly, UserPermission } from '@common/types';
import { createRegisteredContext } from 'react-singleton-context';
import { useUpdateUserInfo } from './hooks/useUpdateUserInfo';

const AUTH_STATE_KEY = '/auth/state';

export enum AuthError {
  NoStoreAssigned = 'NoStoreAssigned',
  PermissionDenied = 'Forbidden',
  ServerError = 'ServerError',
  Unauthenticated = 'Unauthenticated',
  Timeout = 'Timeout',
}

/**
 * Client-side view of an authenticated session.
 *
 * The actual session token is held server-side in `SessionStore` and ridden along in the HttpOnly
 * `session_{port}` cookie — JavaScript never sees it. This struct carries only the user-facing
 * metadata that the UI needs and a boolean signal that we *think* we're logged in.
 */
export interface AuthState {
  store?: UserStoreNodeFragment;
  user?: User;
  /**
   * True when login succeeded and we haven't seen an unauthenticated/timeout error since. This
   * is a UI hint, not a security guarantee — every request is validated against `SessionStore`
   * on the server.
   */
  isAuthenticated: boolean;
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
  /** True while a valid session is believed to exist. See {@link AuthState.isAuthenticated}. */
  isAuthenticated: boolean;
  user?: User;
  userHasPermission: (permission: UserPermission) => boolean;
  updateUserIsLoading: boolean;
  lastSuccessfulSync?: string | null;
  updateUserError?: string | null;
  updateUser: () => Promise<void>;
}

/**
 * Load the persisted auth state from localStorage. Returns an empty (unauthenticated) state if
 * nothing is stored or the value is corrupt.
 *
 * NB: the actual session token lives in an HttpOnly cookie set by the server — it is never
 * persisted here.
 */
export const getAuthState = (): AuthState => {
  const empty: AuthState = { isAuthenticated: false };
  const raw = localStorage.getItem(AUTH_STATE_KEY);
  if (!raw) return empty;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return empty;
  }
};

export const setAuthState = (state: AuthState) => {
  localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
};

export const clearAuthState = () => {
  localStorage.removeItem(AUTH_STATE_KEY);
};

const authControl: AuthControl = {
  isLoggingIn: false,
  login: (_username: string, _password: string) =>
    new Promise<AuthenticationResponse>(() => ({ token: 'token' })),
  logout: () => {},
  setStore: (_store: UserStoreNodeFragment) => new Promise<void>(() => ({})),
  storeId: 'store-id',
  isAuthenticated: false,
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
  const initial = getAuthState();
  const [state, setState] = useState<AuthState>(initial);
  const [error, setError] = useLocalStorage('/error/auth');
  const storeId = state.store?.id ?? '';
  const {
    login,
    isLoggingIn,
    upsertMostRecentCredential,
    mostRecentCredentials,
  } = useLogin(setState);
  const getUserPermissions = useGetUserPermissions();

  const mostRecentUsername = mostRecentCredentials[0]?.username ?? undefined;

  const setStore = async (store: UserStoreNodeFragment) => {
    if (!state.isAuthenticated) return;

    upsertMostRecentCredential(mostRecentUsername ?? '', store);

    const permissions = await getUserPermissions(store);
    const user: User = {
      id: state.user?.id ?? '',
      name: state.user?.name ?? '',
      permissions,
      email: state.user?.email,
      jobTitle: state.user?.jobTitle,
    };
    const next: AuthState = { ...state, store, user };
    setAuthState(next);
    setState(next);
  };

  const {
    isLoading: updateUserIsLoading,
    lastSuccessfulSync,
    updateUser,
    error: updateUserError,
  } = useUpdateUserInfo(setState, state, mostRecentCredentials);

  const logout = () => {
    clearAuthState();
    setError(undefined);
    setState({ isAuthenticated: false });
  };

  const userHasPermission = (permission: UserPermission) =>
    state.user?.permissions.some(p => p === permission) || false;

  const val = useMemo(
    () => ({
      error,
      isLoggingIn,
      login,
      logout,
      storeId,
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      store: state.store,
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
      state,
      error,
      mostRecentUsername,
      isLoggingIn,
      setStore,
      setError,
      userHasPermission,
    ]
  );

  // No more client-side refresh timer: the server slides the session forward on every
  // authenticated request. If the session has actually expired, the next API call will surface
  // an Unauthenticated error which the GraphQL client maps to `/error/auth`.

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
