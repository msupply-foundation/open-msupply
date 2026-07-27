import { createSignal } from 'solid-js';
import { graphqlFetch, msSinceLastGqlCall } from '../api/graphql';
import {
  AuthToken,
  Logout,
  Me,
  RefreshToken,
  type UserInfoFragment,
} from '../api/auth.generated';
import {
  refetchStoreContext,
  setForceStorePicker,
} from '../store/storeContext';
import { ACTIVITY_CHECK_INTERVAL_MS } from '../config';

// All authentication context lives here: the user, the unauthenticated and
// inactivity signals, and the actions that change them.

// State comes from GraphQL and keeps its generated type (kdd/type-safety).
// The same fragment backs both me and login, so both carry the same shape
// (spec, Guard 1).
export type AuthUser = UserInfoFragment;

const [user, setUser] = createSignal<AuthUser | undefined>(undefined);
export const authUser = user;

// A human display name for the current user: first + last name when set,
// falling back to the login username. The GraphQL UserNode carries no single
// `name` field (unlike the real app's cookie-sourced user.name), so we compose
// one from the parts the UserInfo fragment fetches. Empty string when no user
// is loaded. Reactive (reads authUser) so call sites stay live across login.
export const userDisplayName = (): string => {
  const u = user();
  if (!u) return '';
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return fullName || u.username;
};

// The store code for a store id, from the logged-in user's store list — the
// list StoreGuardLayout itself resolves stores from, so any routed storeId is
// present. Used by the shared list-export filenames
// (spec/ui-standards/list-views.md § regions); the id fallback only guards a
// mid-logout race. Reactive (reads authUser).
export const storeCodeOf = (storeId: string): string =>
  user()?.stores.nodes.find(s => s.id === storeId)?.code ?? storeId;

// The store NAME for a store id, same source and fallback discipline as
// storeCodeOf. Used where a human-facing store label is printed (the
// prescription dispensing labels — spec/prescriptions § label printing).
export const storeNameOf = (storeId: string): string =>
  user()?.stores.nodes.find(s => s.id === storeId)?.name ?? storeId;

// Spec (Unexpected logout): set when any GraphQL call returns unauthenticated —
// reported by graphqlFetch. Cleared by a successful login.
const [unauthenticated, setUnauthenticated] = createSignal(false);
export { unauthenticated };
export const reportUnauthenticated = (): void => {
  setUnauthenticated(true);
};
export const clearUnauthenticated = (): void => {
  setUnauthenticated(false);
};

const [inactivityExpired, setInactivityExpired] = createSignal(false);

// Spec (Unexpected logout / Inactivity): the re-login modal shows when a
// session exists and either a GraphQL call came back unauthenticated or the
// user was inactive too long. The user() guard keeps the startup me check
// (which also travels through graphqlFetch) from triggering the modal.
export const reLoginRequired = (): boolean =>
  Boolean(user()) && (unauthenticated() || inactivityExpired());

// Spec (Re-fetching after sync): the store list arrives on the me response, so
// whatever observes a completed sync calls checkAuth() directly
// (kdd/explicit-composition).

// Returns whether the check settled (authenticated or not — authUser reflects
// the outcome); false on a globally handled failure, so callers stay in their
// loading phase. Does not clear an existing user on an unauthenticated result —
// the re-login modal preserves the user's workflow (spec, Unexpected logout).
export const checkAuth = async (): Promise<boolean> => {
  const result = await graphqlFetch(Me, {});
  if (result.kind === 'success') {
    setUser(result.data.me);
    return true;
  }
  return result.kind === 'unauthenticated';
};

export type LoginResult =
  | { kind: 'success' }
  | { kind: 'error'; message: string }
  // Globally handled failure (unexpected-error modal): the consumer stays in
  // its loading phase.
  | { kind: 'pending' };

export const login = async (
  username: string,
  password: string,
  // The timeout / unexpected-logout re-login modal passes `isReLogin` to
  // PRESERVE the workflow — it keeps the user in their current store rather than
  // re-showing the store picker. A login-page sign-in leaves it off, so a fresh
  // session re-picks its store (spec SL-6).
  options?: { isReLogin?: boolean }
): Promise<LoginResult> => {
  const result = await graphqlFetch(AuthToken, { username, password });
  if (result.kind !== 'success') {
    return { kind: 'pending' };
  }
  const auth = result.data.authToken;
  if (auth.__typename === 'AuthTokenError') {
    return { kind: 'error', message: auth.error.description };
  }
  // Spec (Store Login): a user with no stores cannot log in. The backend
  // enforces this (NoSiteAccess); this is a defensive check only.
  if (auth.user.stores.nodes.length === 0) {
    return { kind: 'error', message: 'You have no stores to log into' };
  }
  setUser(auth.user);
  clearUnauthenticated();
  setInactivityExpired(false);
  // A fresh login-page sign-in goes through the store picker (spec SL-6) — even
  // if the URL still names a store from a previous session — unless a store is
  // remembered / the user has one. NOT on a re-login (the timeout modal keeps
  // the user's workflow) and NOT on a refresh (checkAuth doesn't call login).
  if (!options?.isReLogin) setForceStorePicker(true);
  return { kind: 'success' };
};

// Spec (Authentication Logic, Explicit logout): the backend clears the session
// cookie; clearing the user presents the login page. Unlike unexpected logout,
// no re-login modal. The local session ends regardless of the server response.
export const logout = async (): Promise<void> => {
  await graphqlFetch(Logout, {});
  clearUnauthenticated();
  setInactivityExpired(false);
  refetchStoreContext(undefined);
  setUser(undefined);
};

// Spec (Authentication Logic): inactivity forces the re-login modal; an active
// user with no recent GraphQL traffic triggers a token refresh call.
export const startActivityTracking = (): (() => void) => {
  let lastActivityAt = Date.now();
  const recordActivity = () => {
    lastActivityAt = Date.now();
  };
  const events = [
    'pointerdown',
    'pointermove',
    'keydown',
    'wheel',
    'touchstart',
  ];
  events.forEach(e =>
    window.addEventListener(e, recordActivity, { passive: true })
  );

  const interval = window.setInterval(() => {
    const currentUser = user();
    if (!currentUser || reLoginRequired()) return;
    // Spec (Authentication Logic): both durations come from the me/login
    // response.
    if (
      Date.now() - lastActivityAt >
      currentUser.inactivityTimeoutSeconds * 1000
    ) {
      setInactivityExpired(true);
      return;
    }
    if (msSinceLastGqlCall() > currentUser.tokenRefreshIntervalSeconds * 1000) {
      // Fire-and-forget: graphqlFetch never throws, and a failed ping needs no
      // handling.
      void graphqlFetch(RefreshToken, {});
    }
  }, ACTIVITY_CHECK_INTERVAL_MS);

  return () => {
    events.forEach(e => window.removeEventListener(e, recordActivity));
    clearInterval(interval);
  };
};
