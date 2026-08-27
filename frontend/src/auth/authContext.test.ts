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
  // Not a prescriber anywhere — the ordinary case (spec/prescription-requests
  // § prescriber mode).
  prescriberModeStoreIds: [],
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
        nameId: 'n1',
        name: 'Store 1',
        storeMode: 'STORE',
        homeCurrencyCode: 'USD',
        isDisabled: false,
      },
    ],
  },
};

type StoreNode = UserInfoFragment['stores']['nodes'][number];

const store = (id: string, isDisabled: boolean): StoreNode => ({
  id,
  code: id.toUpperCase(),
  nameId: `n-${id}`,
  name: `Store ${id}`,
  storeMode: 'STORE',
  homeCurrencyCode: 'USD',
  isDisabled,
});

const dispensary = (id: string): StoreNode => ({
  ...store(id, false),
  storeMode: 'DISPENSARY',
});

const userWithStores = (...nodes: StoreNode[]): UserInfoFragment => ({
  ...user,
  stores: { nodes },
});

const prescriberIn = (
  storeIds: string[],
  ...nodes: StoreNode[]
): UserInfoFragment => ({
  ...userWithStores(...nodes),
  prescriberModeStoreIds: storeIds,
});

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

// The same stand-in for localStorage, which app data (the remembered username)
// uses — and which likewise survives a module reset, so a "reload" keeps it.
const makeLocalStorage = () => {
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

beforeEach(() => {
  graphqlFetch.mockReset();
  vi.stubGlobal('sessionStorage', makeSessionStorage());
  vi.stubGlobal('localStorage', makeLocalStorage());
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

describe('the username is trimmed (OMS-REG-LGN-01.29)', () => {
  it('sends the username without its surrounding whitespace', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce(loginSuccess());

    const result = await auth.login('  alice \t\n', 'pw');

    expect(result.kind).toBe('success');
    expect(graphqlFetch).toHaveBeenCalledWith(expect.anything(), {
      username: 'alice',
      password: 'pw',
    });
  });

  it('leaves the password exactly as typed — whitespace is part of the secret', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce(loginSuccess());

    await auth.login('alice', '  pw  ');

    expect(graphqlFetch).toHaveBeenCalledWith(expect.anything(), {
      username: 'alice',
      password: '  pw  ',
    });
  });

  it('remembers the trimmed name', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce(loginSuccess());

    await auth.login(' alice ', 'pw');

    expect((await import('../appData')).getLastLoginUsername()).toBe('alice');
  });
});

describe('the device remembers the last username (OMS-REG-LGN-01.21/.22)', () => {
  const rememberedUsername = async () =>
    (await import('../appData')).getLastLoginUsername();

  it('records the username on a successful login', async () => {
    const auth = await freshModule();
    expect(await rememberedUsername()).toBeUndefined();

    graphqlFetch.mockResolvedValueOnce(loginSuccess());
    await auth.login('alice', 'pw');

    expect(await rememberedUsername()).toBe('alice');
  });

  it('survives an explicit logout — logout ends the session, not the memory', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce(loginSuccess());
    await auth.login('alice', 'pw');

    graphqlFetch.mockResolvedValueOnce({ kind: 'success', data: {} });
    await auth.logout();

    expect(auth.authUser()).toBeUndefined();
    expect(await rememberedUsername()).toBe('alice');
  });

  it('survives a reload', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce(loginSuccess());
    await auth.login('alice', 'pw');

    // Fresh module, same storage — the in-memory user is gone, the name is not.
    const reloaded = await freshModule();
    expect(reloaded.authUser()).toBeUndefined();
    expect(await rememberedUsername()).toBe('alice');
  });

  it('does not record a rejected username', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce({
      kind: 'success',
      data: {
        authToken: {
          __typename: 'AuthTokenError',
          error: { description: 'Invalid username or password' },
        },
      },
    });
    const result = await auth.login('mallory', 'pw');

    expect(result.kind).toBe('error');
    expect(await rememberedUsername()).toBeUndefined();
  });

  it('does not record when the call fails globally', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce({ kind: 'unexpectedError' });
    const result = await auth.login('alice', 'pw');

    expect(result.kind).toBe('pending');
    expect(await rememberedUsername()).toBeUndefined();
  });

  it('replaces the name when a different user logs in', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce(loginSuccess());
    await auth.login('alice', 'pw');
    graphqlFetch.mockResolvedValueOnce(loginSuccess());
    await auth.login('bob', 'pw');

    expect(await rememberedUsername()).toBe('bob');
  });
});

/*
 * Prescriber mode and the store picker (spec/prescription-requests §
 * prescriber mode, PM-7).
 *
 * A prescriber-mode user's destinations all sit behind the dispensary gate, so
 * in a non-dispensary store they would arrive to an empty menu with no way
 * onward. loginableStores is where that store stops being offered — the same
 * single list SL-8 filters, so the store is unlisted, unreachable by URL, and
 * uncounted for single-store auto-entry, all from one rule.
 */
describe('prescriber mode withholds unworkable stores (PM-7)', () => {
  it('drops a non-dispensary store where the user is a prescriber', async () => {
    const auth = await freshModule();

    expect(
      auth
        .loginableStores(
          prescriberIn(['warehouse'], store('warehouse', false), dispensary('clinic'))
        )
        .map(s => s.id)
    ).toEqual(['clinic']);
  });

  it('keeps a non-dispensary store where the user is NOT a prescriber', async () => {
    const auth = await freshModule();

    // Per store on both sides: prescriber at the clinic, ordinary user at the
    // warehouse, so the warehouse stays (PM-2).
    expect(
      auth
        .loginableStores(
          prescriberIn(['clinic'], store('warehouse', false), dispensary('clinic'))
        )
        .map(s => s.id)
    ).toEqual(['warehouse', 'clinic']);
  });

  it('leaves every store for a user who is a prescriber nowhere', async () => {
    const auth = await freshModule();

    expect(
      auth
        .loginableStores(userWithStores(store('warehouse', false), dispensary('clinic')))
        .map(s => s.id)
    ).toEqual(['warehouse', 'clinic']);
  });

  it('still drops a DISABLED dispensary store (SL-8 keeps applying)', async () => {
    const auth = await freshModule();
    const closed: StoreNode = { ...dispensary('clinic'), isDisabled: true };

    expect(
      auth.loginableStores(prescriberIn(['clinic'], closed))
    ).toEqual([]);
  });
});

/*
 * Disabled stores (spec/startup § SL-8, OMS-REG-LGN-02.20–.22,
 * OMS-REG-LGN-01.27).
 *
 * loginableStores is the single list every store guard reads — the picker's
 * contents, the URL-segment match, and the single-store auto-entry count all
 * derive from it, so filtering here is what makes a disabled store unlisted,
 * unreachable by URL, and invisible to auto-entry. The guards' own resolution
 * (URL match, auto-entry) is exercised end-to-end by e2e/specs/login-regression.
 */
describe('disabled stores are never offered (SL-8)', () => {
  it('drops disabled stores from the list the guards read', async () => {
    const auth = await freshModule();
    const nodes = [store('a', false), store('b', true), store('c', false)];

    expect(
      auth.loginableStores(userWithStores(...nodes)).map(s => s.id)
    ).toEqual(['a', 'c']);
  });

  it('leaves one store to auto-enter when the others are disabled', async () => {
    const auth = await freshModule();
    const enabled = auth.loginableStores(
      userWithStores(store('a', true), store('b', false), store('c', true))
    );

    // What StoreGuardLayout's single-store auto-entry counts (.22).
    expect(enabled).toHaveLength(1);
    expect(enabled[0]?.id).toBe('b');
  });

  it('does not resolve a disabled store from a URL segment', async () => {
    const auth = await freshModule();
    const enabled = auth.loginableStores(
      userWithStores(store('a', false), store('b', true))
    );

    // The guard matches params.storeId against this list, so a disabled id
    // finds nothing and falls through to ordinary resolution (.21).
    expect(enabled.find(s => s.id === 'b')).toBeUndefined();
  });

  it('is empty for no user', async () => {
    const auth = await freshModule();
    expect(auth.loginableStores(undefined)).toEqual([]);
  });

  it('refuses login when every store is disabled (OMS-REG-LGN-01.27)', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce({
      kind: 'success',
      data: {
        authToken: {
          __typename: 'AuthToken',
          user: userWithStores(store('a', true), store('b', true)),
        },
      },
    });

    const result = await auth.login('alice', 'pw');

    expect(result.kind).toBe('error');
    expect(auth.authUser()).toBeUndefined();
  });

  it('admits login when one store survives the filter', async () => {
    const auth = await freshModule();
    graphqlFetch.mockResolvedValueOnce({
      kind: 'success',
      data: {
        authToken: {
          __typename: 'AuthToken',
          user: userWithStores(store('a', true), store('b', false)),
        },
      },
    });

    const result = await auth.login('alice', 'pw');

    expect(result.kind).toBe('success');
    expect(auth.authUser()?.userId).toBe('u1');
  });
});
