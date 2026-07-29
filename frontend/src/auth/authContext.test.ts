import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphqlResult } from '../api/graphql';
import type { UserInfoFragment } from '../api/auth.generated';

// authContext travels through graphqlFetch for me/login/logout; mock it so the
// tests drive the auth outcome directly (the node test env has no network, and
// graphqlFetch itself is covered in api/graphql.test.ts). storeContext is
// mocked because logout() calls refetchStoreContext.
const graphqlFetch = vi.fn();
const msSinceLastGqlCall = vi.fn(() => 0);
vi.mock('../api/graphql', () => ({ graphqlFetch, msSinceLastGqlCall }));
vi.mock('../store/storeContext', () => ({ refetchStoreContext: vi.fn() }));

const user: UserInfoFragment = {
  __typename: 'UserNode',
  userId: 'u1',
  username: 'alice',
  firstName: 'Alice',
  lastName: null,
  email: null,
  jobTitle: null,
  phoneNumber: null,
  inactivityTimeoutSeconds: 600,
  tokenRefreshIntervalSeconds: 60,
  defaultStore: { id: 's1' },
  stores: {
    nodes: [
      {
        id: 's1',
        code: 'S1',
        name: 'Store 1',
        storeMode: 'STORE',
        homeCurrencyCode: 'USD',
      },
    ],
  },
};

const meSuccess = (): GraphqlResult<{ me: UserInfoFragment }> => ({
  kind: 'success',
  data: { me: user },
});
const loginSuccess = (): GraphqlResult<{
  authToken: { __typename: 'AuthToken'; user: UserInfoFragment };
}> => ({
  kind: 'success',
  data: { authToken: { __typename: 'AuthToken', user } },
});

// A minimal in-memory sessionStorage that survives module resets — this is what
// makes it a faithful stand-in for a browser reload: fresh module (in-memory
// signals reset), same storage (the persisted flag carries over).
const makeSessionStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
};

// Loads a FRESH authContext module — simulating a page reload: module-level
// signals start clean, while the stubbed sessionStorage (a global) persists.
const freshModule = async () => {
  vi.resetModules();
  return import('./authContext');
};

beforeEach(() => {
  graphqlFetch.mockReset();
  vi.stubGlobal('sessionStorage', makeSessionStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('re-login requirement persists across a reload (D69, OMS-REG-LGN-01.16/.17)', () => {
  it('an unexpected logout persists the requirement so a reload re-arms it', async () => {
    // Tab 1: signed in, then a call comes back unauthenticated.
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce(meSuccess());
    await auth.checkAuth();
    expect(auth.reLoginRequired()).toBe(false);

    auth.reportUnauthenticated();
    expect(auth.reLoginRequired()).toBe(true);
    // The requirement was mirrored to storage.
    expect(sessionStorage.getItem('oms.reLoginRequired')).toBe('1');

    // Reload: fresh module (signals reset), same storage, cookie still valid so
    // me succeeds. The requirement must come back, not be bypassed.
    const reloaded = await freshModule();
    expect(reloaded.reLoginRequired()).toBe(false); // nothing armed yet
    graphqlFetch.mockResolvedValueOnce(meSuccess());
    await reloaded.checkAuth();
    expect(reloaded.authUser()).toBeDefined(); // user re-established
    expect(reloaded.reLoginRequired()).toBe(true); // ...but modal re-armed
  });

  it('a successful re-login discharges the requirement, so a later reload does not re-arm', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce(meSuccess());
    await auth.checkAuth();
    auth.reportUnauthenticated();
    expect(sessionStorage.getItem('oms.reLoginRequired')).toBe('1');

    // Re-login succeeds → clears the requirement and its persisted mirror.
    graphqlFetch.mockResolvedValueOnce(loginSuccess());
    const result = await auth.login('alice', 'pw');
    expect(result.kind).toBe('success');
    expect(auth.reLoginRequired()).toBe(false);
    expect(sessionStorage.getItem('oms.reLoginRequired')).toBeNull();

    // Reload after a discharged requirement: me succeeds, no modal.
    const reloaded = await freshModule();
    graphqlFetch.mockResolvedValueOnce(meSuccess());
    await reloaded.checkAuth();
    expect(reloaded.reLoginRequired()).toBe(false);
  });

  it('an explicit logout clears the persisted requirement', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce(meSuccess());
    await auth.checkAuth();
    auth.reportUnauthenticated();
    expect(sessionStorage.getItem('oms.reLoginRequired')).toBe('1');

    graphqlFetch.mockResolvedValueOnce({ kind: 'success', data: {} });
    await auth.logout();
    expect(sessionStorage.getItem('oms.reLoginRequired')).toBeNull();

    // A reload after logout: me fails (session gone) → login page, no modal.
    const reloaded = await freshModule();
    graphqlFetch.mockResolvedValueOnce({ kind: 'unauthenticated' });
    await reloaded.checkAuth();
    expect(reloaded.reLoginRequired()).toBe(false);
    expect(reloaded.authUser()).toBeUndefined();
  });

  it('a normal reload with no owed re-login shows no modal', async () => {
    // No requirement was ever raised: reload just re-establishes the user.
    const reloaded = await freshModule();
    graphqlFetch.mockResolvedValueOnce(meSuccess());
    await reloaded.checkAuth();
    expect(reloaded.authUser()).toBeDefined();
    expect(reloaded.reLoginRequired()).toBe(false);
  });

  it('degrades gracefully when sessionStorage is unavailable', async () => {
    // Access throws (private mode / disabled storage): auth must not break, the
    // requirement simply does not survive a reload.
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    } as unknown as Storage);

    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce(meSuccess());
    await auth.checkAuth();
    // reportUnauthenticated still works in-memory despite the storage throw.
    expect(() => auth.reportUnauthenticated()).not.toThrow();
    expect(auth.reLoginRequired()).toBe(true);
  });
});
