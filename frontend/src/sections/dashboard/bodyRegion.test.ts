/*
 * The dashboard BODY region — the screen-level slot
 * (spec/dashboard/cases/OMS-REG-DB-02 § body region, ui-surface §
 * body-region semantics).
 *
 * Two layers, both here: `selectBodyOccupant` as plain data (which claimant
 * wins, and what is said about the ones passed over), and `bodyRegion` through
 * the REAL host path — the registry, the slot boundary, and a contribution's
 * `when` gate — so a store the gate excludes provably gets no candidate at all.
 * The store context is the one thing mocked, as signals, because a store switch
 * must re-answer the region.
 *
 * The RENDER half (falling back to the built-in body, the error boundary around
 * the occupant) is `DashboardBody.tsx`; the unit env has no DOM, and the
 * on-screen behaviours are the plugins vertical's pending render integration
 * (OMS-REG-DB-02.13–.16).
 *
 * eslint-disable solid/reactivity -- each region memo is read by hand between
 * signal writes; there is no JSX here to read it from, and each read is the
 * assertion.
 */
/* eslint-disable solid/reactivity */
import { createMemo, createRoot, createSignal } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnyContribution, SlotContext } from '../../plugin-sdk/types';

const [storeId, setStoreId] = createSignal<string | undefined>(undefined);
const [storeMode, setStoreMode] = createSignal<
  'STORE' | 'DISPENSARY' | undefined
>(undefined);

vi.mock('../../store/storeContext', () => ({
  currentStoreId: () => storeId(),
  currentStoreMode: () => storeMode(),
  storeContext: () => ({
    me: undefined,
    storePreferences: {
      useConsumptionAndStockFromCustomersForInternalOrders: false,
    },
  }),
}));

import { clearPlugins, registerPlugin } from '../../plugins/registry';
import { bodyRegion, selectBodyOccupant } from './bodyRegion';

const Component = () => null;

const occupant = (id: string) => ({ id, Component });

const body = (id: string, extra: Partial<AnyContribution> = {}) =>
  ({ slot: 'dashboard.body', id, Component, ...extra }) as AnyContribution;

const install = (code: string, ...contributions: AnyContribution[]) =>
  registerPlugin({
    code,
    module: {
      kind: 'oms.plugin',
      manifest: { code, version: '1.0.0', pluginApiVersion: 1 },
      contributions,
    },
  });

/** The region, read the way the page reads it: inside one memo. */
const region = () =>
  createRoot(dispose => {
    const value = createMemo(bodyRegion)();
    dispose();
    return value;
  });

/** The gate a store-mode-scoped body declares (positively — CK-1.1). */
const dispensaryOnly = (ctx: SlotContext) => ctx.storeMode === 'dispensary';

beforeEach(() => {
  clearPlugins();
  setStoreId(undefined);
  setStoreMode(undefined);
});

describe('selectBodyOccupant (OMS-REG-DB-02.15)', () => {
  it('leaves the region empty when nothing claims it', () => {
    expect(selectBodyOccupant([])).toEqual({
      occupant: undefined,
      diagnostics: [],
    });
  });

  it('takes the one claimant, with nothing to report', () => {
    const region = selectBodyOccupant([occupant('ck.navigator')]);
    expect(region.occupant?.id).toBe('ck.navigator');
    expect(region.diagnostics).toEqual([]);
  });

  it('takes the first of several and NAMES each one passed over', () => {
    // The candidates arrive in the registry's deterministic order, so "first"
    // is `order` → plugin code → contribution id. Exactly one renders; the
    // rest degrade loudly, never by silently disappearing.
    const region = selectBodyOccupant([
      occupant('ck.navigator'),
      occupant('other.home'),
      occupant('third.home'),
    ]);
    expect(region.occupant?.id).toBe('ck.navigator');
    expect(region.diagnostics.map(d => d.contributionId)).toEqual([
      'other.home',
      'third.home',
    ]);
    // The winner is named too, so the message says which screen the reader is
    // actually looking at.
    expect(region.diagnostics[0]?.message).toContain('ck.navigator');
  });
});

describe('bodyRegion — through the registry and the gate', () => {
  it('is empty with no plugins at all (OMS-REG-DB-02.12)', () => {
    expect(region().occupant).toBeUndefined();
  });

  it('ignores a plugin that contributes to the piece regions only', () => {
    install('civ', { slot: 'dashboard.widget', id: 'w', Component });
    expect(region().occupant).toBeUndefined();
  });

  it('publishes the occupant under plugin code + contribution id', () => {
    install('cook_islands', body('home-navigator'));
    expect(region().occupant?.id).toBe('cook_islands.home-navigator');
  });

  it('offers no candidate in a store the gate excludes (OMS-REG-DB-02.14)', () => {
    install('cook_islands', body('home-navigator', { when: dispensaryOnly }));

    // Mode unresolved: a positive gate is off, so the built-in body is what a
    // store gets — never a navigator flashed in ahead of its own gate.
    expect(region().occupant).toBeUndefined();

    setStoreMode('STORE');
    expect(region().occupant).toBeUndefined();

    setStoreMode('DISPENSARY');
    expect(region().occupant?.id).toBe('cook_islands.home-navigator');
  });

  it('re-answers on a store switch, both ways', () => {
    install('cook_islands', body('home-navigator', { when: dispensaryOnly }));

    setStoreId('clinic');
    setStoreMode('DISPENSARY');
    expect(region().occupant?.id).toBe('cook_islands.home-navigator');

    setStoreId('depot');
    setStoreMode('STORE');
    expect(region().occupant).toBeUndefined();

    setStoreId('clinic');
    setStoreMode('DISPENSARY');
    expect(region().occupant?.id).toBe('cook_islands.home-navigator');
  });

  it('resolves two claiming plugins by order, then plugin code', () => {
    install('zebra', body('home'));
    install('alpha', body('home'));
    // No `order` on either: the plugin code breaks the tie, and it is the same
    // answer whichever bundle finished loading first.
    expect(region().occupant?.id).toBe('alpha.home');
    expect(region().diagnostics.map(d => d.contributionId)).toEqual([
      'zebra.home',
    ]);

    clearPlugins();
    install('zebra', body('home', { order: 1 }));
    install('alpha', body('home'));
    // An explicit `order` outranks the code — `alpha` has none, so it sorts
    // last.
    expect(region().occupant?.id).toBe('zebra.home');
  });

  it('counts only the claimants the store can see when resolving several', () => {
    install('cook_islands', body('home', { when: dispensaryOnly }));
    install('other', body('home'));

    // The gated one is not a candidate here, so the ungated one is the
    // occupant and there is nothing to report.
    expect(region().occupant?.id).toBe('other.home');
    expect(region().diagnostics).toEqual([]);

    setStoreMode('DISPENSARY');
    expect(region().occupant?.id).toBe('cook_islands.home');
    expect(region().diagnostics.map(d => d.contributionId)).toEqual([
      'other.home',
    ]);
  });

  it('drops the occupant with the plugin that contributed it', () => {
    install('cook_islands', body('home-navigator'));
    expect(region().occupant).toBeDefined();
    clearPlugins();
    expect(region().occupant).toBeUndefined();
  });
});
