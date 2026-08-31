/*
 * eslint-disable solid/reactivity -- the store-switch test reads its memo by
 * hand between signal writes, which is how it observes each intermediate
 * verdict; there is no JSX here to read it from.
 */
/* eslint-disable solid/reactivity */
import { createMemo, createRoot, createSignal } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlotContext } from '../plugin-sdk/types';

// The boundary reads the host's store-context signals, so the tests drive
// those directly — as SIGNALS, since a store switch must re-evaluate every
// `when` gate (spec/plugins/sdk-contract.md § gating is two-layered).
const [storeId, setStoreId] = createSignal<string | undefined>(undefined);
const [storeMode, setStoreMode] = createSignal<
  'STORE' | 'DISPENSARY' | undefined
>(undefined);
const [preferences, setPreferences] = createSignal<
  | {
      useConsumptionAndStockFromCustomersForInternalOrders: boolean;
      monthsUnderstock: number;
    }
  | undefined
>(undefined);

vi.mock('../store/storeContext', () => ({
  currentStoreId: () => storeId(),
  currentStoreMode: () => storeMode(),
  storeContext: () => {
    const storePreferences = preferences();
    return storePreferences && { me: undefined, storePreferences };
  },
}));

import { slotContext } from './slotContext';

beforeEach(() => {
  setStoreId(undefined);
  setStoreMode(undefined);
  setPreferences(undefined);
});

/** The shape of gate a mode-scoped contribution declares. */
const isDispensaryStore = (ctx: SlotContext) => ctx.storeMode === 'dispensary';

describe('store mode (CK-1.1)', () => {
  it('publishes the entered store mode as a domain word', () => {
    setStoreMode('DISPENSARY');
    expect(slotContext().storeMode).toBe('dispensary');

    setStoreMode('STORE');
    expect(slotContext().storeMode).toBe('store');
  });

  it('reports the mode as unknown until the store context resolves', () => {
    expect(slotContext().storeMode).toBeUndefined();
  });

  it('leaves a mode gate OFF while the mode is unresolved', () => {
    // The safe default the host's isDispensary() has: a gated surface must not
    // flash in before its store's mode is known.
    expect(isDispensaryStore(slotContext())).toBe(false);

    setStoreMode('DISPENSARY');
    expect(isDispensaryStore(slotContext())).toBe(true);
  });

  it('leaves a mode gate OFF in a non-dispensary store', () => {
    setStoreMode('STORE');
    expect(isDispensaryStore(slotContext())).toBe(false);
  });

  it('re-evaluates the gate on a store switch', () => {
    const gate = vi.fn(isDispensaryStore);

    createRoot(dispose => {
      // The host reads the context inside ONE memo per slot region
      // (PluginSlot), so that is the shape the gate is exercised in here.
      const visible = createMemo(() => gate(slotContext()));

      // Nothing entered yet: the mode is unknown, so the gate is off.
      expect(visible()).toBe(false);

      // The dispensary store the user first enters.
      setStoreId('store-a');
      setStoreMode('DISPENSARY');
      expect(visible()).toBe(true);

      // Switching stores: unresolved between the two (the store guard
      // withholds its children), then settled on a non-dispensary store.
      setStoreId(undefined);
      setStoreMode(undefined);
      expect(visible()).toBe(false);

      setStoreId('store-b');
      setStoreMode('STORE');
      expect(visible()).toBe(false);

      // The gate ran again for the second store — it is not a verdict captured
      // once at first render.
      expect(gate.mock.calls.length).toBeGreaterThan(1);

      dispose();
    });
  });
});

describe('the rest of the session surface still rides along', () => {
  it('carries the store id and the store-preference gate', () => {
    setStoreId('store-a');
    setPreferences({
      useConsumptionAndStockFromCustomersForInternalOrders: true,
      monthsUnderstock: 3,
    });

    const ctx = slotContext();
    expect(ctx.storeId).toBe('store-a');
    expect(
      ctx.storePreferences.useConsumptionAndStockFromCustomersForInternalOrders
    ).toBe(true);
    expect(ctx.permissions).toEqual([]);
  });

  it('carries the understock threshold', () => {
    setPreferences({
      useConsumptionAndStockFromCustomersForInternalOrders: false,
      monthsUnderstock: 6,
    });

    expect(slotContext().storePreferences.monthsUnderstock).toBe(6);
  });

  /*
   * The threshold has no safe default, unlike the boolean beside it. A
   * consumer computes a figure from it and states it in a label, so a
   * substituted value would be confidently wrong where `undefined` merely
   * holds the figure at its dash.
   */
  it('leaves the threshold undefined while the store context is unresolved — never a default', () => {
    setPreferences(undefined);

    const { monthsUnderstock, ...gates } = slotContext().storePreferences;
    expect(monthsUnderstock).toBeUndefined();
    // The booleans DO default, and to OFF — the two rules coexist.
    expect(gates.useConsumptionAndStockFromCustomersForInternalOrders).toBe(
      false
    );
  });
});
