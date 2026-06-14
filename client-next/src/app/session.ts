import { create } from 'zustand';
import type { UserPermission } from '@/gql/schema';

export interface SessionStore {
  id: string;
  code: string;
  name: string;
}

export interface SessionUser {
  userId: string;
  username: string;
}

export interface SessionPayload {
  token: string;
  user: SessionUser;
  store?: SessionStore;
  stores?: SessionStore[];
  permissions?: UserPermission[];
}

/**
 * Shape persisted to the shared `auth` cookie. Kept compatible with the legacy
 * client so a session hands off both ways during coexistence (see plan §9).
 */
interface AuthCookie {
  token: string;
  user?: SessionUser;
  store?: SessionStore;
  expires?: string;
}

const AUTH_COOKIE = 'auth';

const readCookie = (name: string): string | undefined => {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
};

const readAuthCookie = (): AuthCookie | null => {
  const raw = readCookie(AUTH_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as AuthCookie;
  } catch {
    return null;
  }
};

const writeAuthCookie = (auth: AuthCookie | null): void => {
  if (!auth) {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
    return;
  }
  const value = encodeURIComponent(JSON.stringify(auth));
  document.cookie = `${AUTH_COOKIE}=${value}; path=/; samesite=strict`;
};

interface SessionState {
  token: string | null;
  user: SessionUser | null;
  store: SessionStore | null;
  stores: SessionStore[];
  permissions: UserPermission[];
  isAuthenticated: boolean;
  setSession: (payload: SessionPayload) => void;
  setToken: (token: string) => void;
  setUser: (user: SessionUser) => void;
  setStore: (store: SessionStore) => void;
  setStores: (stores: SessionStore[]) => void;
  clear: () => void;
}

const initial = readAuthCookie();

export const useSession = create<SessionState>(set => ({
  token: initial?.token ?? null,
  user: initial?.user ?? null,
  store: initial?.store ?? null,
  stores: [],
  permissions: [],
  isAuthenticated: Boolean(initial?.token),
  setSession: payload => {
    writeAuthCookie({
      token: payload.token,
      user: payload.user,
      store: payload.store,
    });
    set({
      token: payload.token,
      user: payload.user,
      store: payload.store ?? null,
      stores: payload.stores ?? [],
      permissions: payload.permissions ?? [],
      isAuthenticated: true,
    });
  },
  // Swap in a freshly-refreshed bearer token, keeping the rest of the session.
  setToken: token =>
    set(state => {
      writeAuthCookie({
        token,
        user: state.user ?? undefined,
        store: state.store ?? undefined,
      });
      return { token, isAuthenticated: true };
    }),
  // Restore the user identity into a session that has a token but lost its user
  // (a partial cookie) — keeps the rest of the cookie intact.
  setUser: user =>
    set(state => {
      if (state.token) {
        writeAuthCookie({
          token: state.token,
          user,
          store: state.store ?? undefined,
        });
      }
      return { user };
    }),
  // The user's accessible stores aren't persisted in the cookie; populated in
  // memory (e.g. fetched on a cold load to validate a store-scoped URL).
  setStores: stores => set({ stores }),
  setStore: store =>
    set(state => {
      if (state.token) {
        writeAuthCookie({
          token: state.token,
          user: state.user ?? undefined,
          store,
        });
      }
      return { store };
    }),
  clear: () => {
    writeAuthCookie(null);
    set({
      token: null,
      user: null,
      store: null,
      stores: [],
      permissions: [],
      isAuthenticated: false,
    });
  },
}));

/** Non-reactive accessors for the gql client and route loaders. */
export const getToken = (): string | null => useSession.getState().token;
export const getStoreId = (): string | undefined =>
  useSession.getState().store?.id;
