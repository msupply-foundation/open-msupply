import { createMemo, createRoot } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserInfoFragment } from '../api/auth.generated';
import type { SlotContext } from '../plugin-sdk/types';

/*
 * The store-mode gate through the REAL host path (CK-1.1).
 *
 * slotContext.test.ts covers the boundary with the store context mocked — it
 * proves the mapping, not the wiring. This suite mocks only the two EDGES the
 * node env cannot have (the network, and the login response the auth signal
 * holds) and runs everything between them for real: refetchStoreContext →
 * currentStoreId / currentStoreMode → the slot boundary → the registry →
 * `when`. A mock that drifts from the real me/login shape fails here, which is
 * the point.
 *
 * Hoisted, because vi.mock's factory runs before the SUT's own imports resolve.
 *
 * eslint-disable solid/reactivity -- the region's memo is read by hand here;
 * there is no JSX to read it from, and each read is the assertion.
 */
/* eslint-disable solid/reactivity */
const edges = vi.hoisted(() => {
  // Filled in by the auth mock's factory below, once solid-js is loadable.
  const auth: { setUser: (user: unknown) => void } = { setUser: () => {} };
  const state: {
    // Only the store-context fields the slot boundary reads; the guard-3
    // response is otherwise irrelevant to a mode gate.
    payload: unknown;
    fetchFails: boolean;
  } = {
    payload: {
      storePreferences: {
        useConsumptionAndStockFromCustomersForInternalOrders: false,
      },
      preferences: {},
      me: {
        __typename: 'UserNode',
        permissions: { nodes: [{ permissions: ['REQUISITION_MUTATE'] }] },
      },
    },
    fetchFails: false,
  };
  return {
    state,
    auth,
    graphqlFetch: vi.fn(async () =>
      state.fetchFails
        ? { kind: 'error', error: { kind: 'network' } }
        : { kind: 'success', data: state.payload }
    ),
  };
});

// A REAL signal behind authUser, with the app's own comparator — not a getter
// over a plain field. currentStoreMode memoises over this signal, and the last
// test in this suite pins that it is the MEMO, not the raw `me` payload, that a
// slot region ends up depending on; a plain-field stand-in could not observe
// that at all.
vi.mock('../auth/authContext', async () => {
  const { createSignal } = await import('solid-js');
  const { sameFetchedValue } = await import('../typeHelpers');
  const [user, setUser] = createSignal<unknown>(undefined, {
    equals: sameFetchedValue,
  });
  edges.auth.setUser = value => setUser(() => value);
  return { authUser: user };
});
vi.mock('../api/graphql', () => ({ graphqlFetch: edges.graphqlFetch }));

import { isDispensary, refetchStoreContext } from '../store/storeContext';
import { clearPlugins, registerPlugin } from './registry';
import { visibleContributions } from './PluginSlot';
import { slotContext } from './slotContext';

const store = (
  id: string,
  storeMode: 'STORE' | 'DISPENSARY'
): UserInfoFragment['stores']['nodes'][number] => ({
  id,
  code: id.toUpperCase(),
  nameId: `n-${id}`,
  name: `Store ${id}`,
  storeMode,
  homeCurrencyCode: 'NZD',
  isDisabled: false,
});

// The login response the user arrives with: one store of each mode, exactly as
// the me/login query delivers them.
const loggedIn: UserInfoFragment = {
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
  defaultStore: { id: 'clinic' },
  stores: { nodes: [store('clinic', 'DISPENSARY'), store('depot', 'STORE')] },
};

// What CK-3.1 will declare: a dashboard contribution for dispensary stores
// only, gated the way the SDK documents — positively.
const dispensaryOnly = (ctx: SlotContext) => ctx.storeMode === 'dispensary';

const registerNavigator = () =>
  registerPlugin({
    code: 'cook_islands',
    module: {
      kind: 'oms.plugin',
      manifest: {
        code: 'cook_islands',
        version: '1.0.0',
        pluginApiVersion: 1,
      },
      contributions: [
        {
          slot: 'dashboard.widget',
          id: 'home-navigator',
          when: dispensaryOnly,
          Component: () => null,
        },
      ],
    },
  });

// The visible contributions, read the way a slot region reads them (one memo).
const gatedIds = () =>
  createRoot(dispose => {
    const visible = createMemo(() =>
      visibleContributions('dashboard.widget').map(c => c.id)
    );
    const ids = visible();
    dispose();
    return ids;
  });

beforeEach(async () => {
  clearPlugins();
  edges.auth.setUser(undefined);
  edges.state.fetchFails = false;
  await refetchStoreContext(undefined);
});

describe('gating a contribution on store mode (CK-1.1)', () => {
  it('withholds it until a store is entered', () => {
    registerNavigator();
    edges.auth.setUser(loggedIn);

    // Logged in, no store entered: the mode is not known, so a positive gate
    // is off and the contribution never renders.
    expect(slotContext().storeMode).toBeUndefined();
    expect(gatedIds()).toEqual([]);
  });

  it('renders it in a dispensary-mode store', async () => {
    registerNavigator();
    edges.auth.setUser(loggedIn);
    await refetchStoreContext('clinic');

    expect(slotContext().storeMode).toBe('dispensary');
    expect(gatedIds()).toEqual(['home-navigator']);
  });

  it('withholds it in a store-mode store', async () => {
    registerNavigator();
    edges.auth.setUser(loggedIn);
    await refetchStoreContext('depot');

    expect(slotContext().storeMode).toBe('store');
    expect(gatedIds()).toEqual([]);
  });

  it('re-gates on a store switch, both ways', async () => {
    registerNavigator();
    edges.auth.setUser(loggedIn);

    await refetchStoreContext('clinic');
    expect(gatedIds()).toEqual(['home-navigator']);

    await refetchStoreContext('depot');
    expect(gatedIds()).toEqual([]);

    await refetchStoreContext('clinic');
    expect(gatedIds()).toEqual(['home-navigator']);
  });

  it('reports the mode alongside the rest of the session surface', async () => {
    edges.auth.setUser(loggedIn);
    await refetchStoreContext('clinic');

    const ctx = slotContext();
    expect(ctx.storeId).toBe('clinic');
    expect(ctx.storeMode).toBe('dispensary');
    expect(ctx.permissions).toEqual(['REQUISITION_MUTATE']);
  });

  // isDispensary() gates the whole patient surface — the Dispensary nav group
  // and its routes — and every suite that exercises those MOCKS it, so nothing
  // else pins the real accessor. CK-1.1 re-expressed it over
  // currentStoreMode(); this is what catches that refactor changing its answer.
  it('leaves isDispensary() answering exactly as before', async () => {
    edges.auth.setUser(loggedIn);
    expect(isDispensary()).toBe(false); // no store entered

    await refetchStoreContext('clinic');
    expect(isDispensary()).toBe(true);

    await refetchStoreContext('depot');
    expect(isDispensary()).toBe(false);

    // Safe default OFF: a failed context fetch must not admit the surface.
    edges.state.fetchFails = true;
    await refetchStoreContext('clinic');
    expect(isDispensary()).toBe(false);
  });

  it('leaves the mode unknown when the context fetch fails', async () => {
    registerNavigator();
    edges.auth.setUser(loggedIn);
    edges.state.fetchFails = true;
    await refetchStoreContext('clinic');

    // The guard leaves the context empty on a failure, so no store is entered:
    // no mode is known, and the gated contribution stays off.
    expect(slotContext().storeId).toBeUndefined();
    expect(slotContext().storeMode).toBeUndefined();
    expect(gatedIds()).toEqual([]);
  });

  /*
   * The identity guarantee PluginSlot's one memo exists for
   * (kdd/solid-reactivity-pitfalls). A slot region's memo maps to fresh
   * `{ id, Component }` objects for a reference-keyed `<For>`, so a recompute
   * remounts every live contribution — typed input lost, per-contribution
   * fetches re-run. Reading the store's mode must therefore cost the region a
   * dependency on the MODE, not on the whole `me` payload: `me` is republished
   * whenever a store is renamed or added centrally, a store is disabled, or the
   * user's own name or timeout changes, none of which a mode gate cares about.
   */
  it('does not rebuild a slot region when `me` changes but the mode does not', async () => {
    registerNavigator();
    edges.auth.setUser(loggedIn);
    await refetchStoreContext('clinic');

    createRoot(dispose => {
      const rendered = createMemo(() =>
        visibleContributions('dashboard.widget').map(contribution => ({
          id: contribution.id,
          Component: contribution.Component,
        }))
      );
      const first = rendered();
      expect(first.map(c => c.id)).toEqual(['home-navigator']);

      // A genuinely different `me` — the entered store renamed centrally, the
      // other one disabled — carrying the same mode for the entered store.
      edges.auth.setUser({
        ...loggedIn,
        stores: {
          nodes: [
            { ...store('clinic', 'DISPENSARY'), name: 'Rarotonga Clinic' },
            { ...store('depot', 'STORE'), isDisabled: true },
          ],
        },
      } satisfies UserInfoFragment);
      expect(rendered()).toBe(first); // same array ⇒ nothing remounts

      // The mode itself flipping still re-gates: the memo filters propagation,
      // it does not freeze it.
      edges.auth.setUser({
        ...loggedIn,
        stores: { nodes: [store('clinic', 'STORE'), store('depot', 'STORE')] },
      } satisfies UserInfoFragment);
      expect(rendered()).not.toBe(first);
      expect(rendered()).toEqual([]);

      dispose();
    });
  });
});
