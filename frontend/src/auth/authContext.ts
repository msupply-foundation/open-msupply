import { createSignal } from 'solid-js';
import { sameFetchedValue } from '../typeHelpers';
import { graphqlFetch, msSinceLastGqlCall } from '../api/graphql';
import {
  AuthToken,
  Logout,
  Me,
  RefreshToken,
  type UserInfoFragment,
} from '../api/auth.generated';
import { refetchStoreContext } from '../store/storeContext';
import { recordLastLoginUsername } from '../appData';
import { ACTIVITY_CHECK_INTERVAL_MS } from '../config';

// All authentication context lives here: the user, the unauthenticated and
// inactivity signals, and the actions that change them.

// State comes from GraphQL and keeps its generated type (kdd/type-safety).
// The same fragment backs both me and login, so both carry the same shape
// (spec, Guard 1).
export type AuthUser = UserInfoFragment;

// Fetched state: the post-sync refresh re-reads `me` every run, so an
// unchanged response must publish nothing (kdd/state-management decision 5).
const [user, setUser] = createSignal<AuthUser | undefined>(undefined, {
  equals: sameFetchedValue,
});
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

// The id of the currently authenticated user — the user's identity, which is
// an AUTH property (the me/login response), not a store-context one. Reactive
// and module-level so global caches keyed by user (the user layer of table
// config, kdd/table-state) can depend on it without a component, and available
// as soon as login lands — before any store is entered. Undefined when no user
// is loaded (logged out / between sessions).
export const currentUserId = (): string | undefined => user()?.userId;

// Spec (The re-login requirement outlives a reload, D69): the re-login
// requirement is a property of the tab's session, not of the current page's
// in-memory state — the browser may still hold a valid session cookie, so a
// reloaded me check can succeed and would otherwise silently re-admit the user,
// letting a reload bypass the re-login just demanded. We mirror the requirement
// into sessionStorage (per-tab, cleared when the tab closes) so it survives a
// reload; checkAuth re-arms the signal from it after startup re-establishes the
// user. Cross-tab sharing is deliberately NOT done here (deferred — issue
// #646). Access is guarded: sessionStorage is absent in the node test
// environment and can throw (private-mode / disabled storage), and its loss
// only weakens the reload guard — never break auth over it.
const RELOGIN_STORAGE_KEY = 'oms.reLoginRequired';
const persistReLoginRequired = (required: boolean): void => {
  try {
    if (required) sessionStorage.setItem(RELOGIN_STORAGE_KEY, '1');
    else sessionStorage.removeItem(RELOGIN_STORAGE_KEY);
  } catch {
    // No sessionStorage (or access denied): reload-persistence is best-effort.
  }
};
const reLoginRequiredWasPersisted = (): boolean => {
  try {
    return sessionStorage.getItem(RELOGIN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

// Spec (Store Login, SL-8): the stores a user can actually log into. A store
// the site has disabled is not one of them, so it is never listed, never
// resolves from a URL segment, and never counts towards single-store
// auto-entry. The front end owns this end to end — the server neither filters
// `stores` nor refuses a login into a disabled one (contract § login errors).
// Takes the user rather than reading the signal so callers stay reactive on
// their own read of it.
export const loginableStores = (
  u: AuthUser | undefined
): AuthUser['stores']['nodes'] =>
  u?.stores.nodes.filter(store => !store.isDisabled) ?? [];

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
  persistReLoginRequired(true);
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
    // Spec (The re-login requirement outlives a reload, D69): a reload re-runs
    // this check and, on a still-valid session cookie, succeeds — which would
    // silently re-admit a user who owed a re-login. Re-arm the requirement from
    // its persisted mirror so the modal returns instead of being bypassed. Only
    // a successful login (or explicit logout) clears the mirror.
    if (reLoginRequiredWasPersisted()) setUnauthenticated(true);
    return true;
  }
  return result.kind === 'unauthenticated';
};

export type LoginResult =
  | { kind: 'success' }
  | { kind: 'error'; message: string }
  // Globally handled failure (unexpected-error modal owns the description): the
  // consumer shows no error of its own, but releases its submitting state so
  // the form is usable again with what was typed (spec, Unexpected API errors).
  | { kind: 'pending' };

export const login = async (
  typedUsername: string,
  password: string
): Promise<LoginResult> => {
  // Spec (rules § authentication): leading and trailing whitespace around the
  // username is not part of the credential — a name typed with a stray space,
  // pasted, or autofilled with padding is the same user, and the server would
  // otherwise reject it. Trimmed here, at the one place both login forms (the
  // login page and the re-login modal) go through, so what is sent and what is
  // remembered are the same trimmed name. The password is NEVER trimmed:
  // whitespace in it is a real character of the secret.
  const username = typedUsername.trim();
  const result = await graphqlFetch(AuthToken, { username, password });
  if (result.kind !== 'success') {
    return { kind: 'pending' };
  }
  const auth = result.data.authToken;
  if (auth.__typename === 'AuthTokenError') {
    return { kind: 'error', message: auth.error.description };
  }
  // Spec (Store Login): a user with no store to log into cannot log in. The
  // backend enforces the zero-store case (NoSiteAccess), so that half is
  // defensive — but it counts store rows without regard to isDisabled, so the
  // all-disabled case (SL-8) reaches us and is ours alone to refuse.
  if (loginableStores(auth.user).length === 0) {
    return { kind: 'error', message: 'You have no stores to log into' };
  }
  setUser(auth.user);
  clearUnauthenticated();
  setInactivityExpired(false);
  // A successful re-login discharges the persisted requirement (D69).
  persistReLoginRequired(false);
  // Spec (Authentication): the device remembers the last username to get in, so
  // the login page can prefill it. Only on success — a rejected name is not
  // worth offering back — and never the password.
  recordLastLoginUsername(username);
  return { kind: 'success' };
};

// Spec (Authentication Logic, Explicit logout): the backend clears the session
// cookie; clearing the user presents the login page. Unlike unexpected logout,
// no re-login modal. The local session ends regardless of the server response.
// The remembered username is deliberately NOT cleared — logout ends the
// session, not the device's memory of who was here (spec § Authentication).
export const logout = async (): Promise<void> => {
  await graphqlFetch(Logout, {});
  clearUnauthenticated();
  setInactivityExpired(false);
  // An explicit logout ends the session — nothing is owed on the next load
  // (D69).
  persistReLoginRequired(false);
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
      // Persist so a reload doesn't bypass the inactivity re-login (D69).
      persistReLoginRequired(true);
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
