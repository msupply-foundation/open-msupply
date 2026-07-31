import { LocalStorage, useLocalStorage } from '../localStorage';
import { UserStoreNodeFragment } from './api/operations.generated';
import { UserPermission } from '@common/types';

export enum AuthError {
  NoStoreAssigned = 'NoStoreAssigned',
  PermissionDenied = 'Forbidden',
  ServerError = 'ServerError',
  Unauthenticated = 'Unauthenticated',
  Timeout = 'Timeout',
}

export type User = {
  id: string;
  name: string;
  permissions: UserPermission[];
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  jobTitle?: string | null;
};

/**
 * Client-side view of an authenticated session.
 *
 * The actual session token is held server-side in `SessionStore` and rides along in the HttpOnly
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

const EMPTY_STATE: AuthState = { isAuthenticated: false };

export const getAuthState = (): AuthState =>
  LocalStorage.getItem('/auth/state') ?? EMPTY_STATE;

export const setAuthState = (state: AuthState) =>
  LocalStorage.setItem('/auth/state', state);

export const clearAuthState = () => LocalStorage.removeItem('/auth/state');

/**
 * Read-side accessor for the persisted auth state. Components re-render when `/auth/state`
 * changes (via [[useLocalStorage]]'s listener) — there is no React Context behind this.
 *
 * Mutations are not exposed here. Use the dedicated hooks:
 *   - [[useLogin]] — sign in
 *   - [[useLogout]] — sign out (server + local)
 *   - [[useSelectStore]] — change active store
 *   - [[useRefreshUserCookie]] — refresh user metadata after sync
 */
export const useAuthContext = () => {
  const [authState] = useLocalStorage('/auth/state', EMPTY_STATE);
  const state = authState ?? EMPTY_STATE;
  return {
    isAuthenticated: state.isAuthenticated,
    store: state.store,
    storeId: state.store?.id ?? '',
    user: state.user,
    userHasPermission: (p: UserPermission) =>
      state.user?.permissions.some(x => x === p) ?? false,
  };
};
