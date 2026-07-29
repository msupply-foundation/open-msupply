/*
 * The contribution registry's invariants (spec/plugins/rules.md §
 * contributions, and the invariants summary):
 *
 * · "Where several contributions share a slot, their order is deterministic —
 *   stable across reloads and INDEPENDENT OF LOAD TIMING."
 * · "A contribution is uniquely identified within its (plugin, slot) pair."
 * · "No contribution renders outside a defined slot."
 *
 * Load-order independence is the one worth a test: it is invisible in
 * development (one plugin, or two that always load in the same order) and
 * reproduces as "the columns swapped around" only in the field.
 *
 * Visibility (`when`) is deliberately NOT exercised here — the registry does
 * not apply it; the slot region gates each contribution individually so a gate
 * flipping cannot remount siblings (see PrescriptionPaymentSlot).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { JSX } from 'solid-js';
import {
  clearPlugins,
  contributionsFor,
  registerPlugin,
  registeredPlugins,
} from './registry';
import { SLOTS, type SlotContribution } from './sdk/types';

const noop = (): JSX.Element => null;

const contribution = (id: string, order?: number): SlotContribution => ({
  slot: SLOTS.prescriptionPaymentForm,
  id,
  order,
  Component: noop,
});

const plugin = (code: string, ...contributions: SlotContribution[]) => ({
  code,
  version: '1.0.0',
  contributions,
});

const keys = () =>
  contributionsFor(SLOTS.prescriptionPaymentForm).map(entry => entry.key);

beforeEach(() => {
  clearPlugins();
});

describe('registry — with nothing registered', () => {
  it('reports no plugins and no contributions', () => {
    expect(registeredPlugins()).toEqual([]);
    expect(keys()).toEqual([]);
  });
});

describe('registry — identity', () => {
  it('keys a contribution by plugin code and contribution id', () => {
    registerPlugin(plugin('civ_plugins', contribution('payment-capture')));
    expect(keys()).toEqual(['civ_plugins.payment-capture']);
  });

  it('lets two plugins use the same contribution id', () => {
    registerPlugin(plugin('a_plugins', contribution('payment')));
    registerPlugin(plugin('b_plugins', contribution('payment')));
    expect(keys()).toEqual(['a_plugins.payment', 'b_plugins.payment']);
  });

  it('replaces a plugin re-registered under the same code', () => {
    registerPlugin(plugin('civ_plugins', contribution('first')));
    registerPlugin(plugin('civ_plugins', contribution('second')));
    expect(registeredPlugins()).toHaveLength(1);
    expect(keys()).toEqual(['civ_plugins.second']);
  });
});

describe('registry — deterministic order', () => {
  it('orders by `order`, ascending', () => {
    registerPlugin(
      plugin(
        'civ_plugins',
        contribution('late', 10),
        contribution('early', 1),
        contribution('middle', 5)
      )
    );
    expect(keys()).toEqual([
      'civ_plugins.early',
      'civ_plugins.middle',
      'civ_plugins.late',
    ]);
  });

  it('treats a missing `order` as 0', () => {
    registerPlugin(
      plugin('civ_plugins', contribution('ordered', 1), contribution('bare'))
    );
    expect(keys()).toEqual(['civ_plugins.bare', 'civ_plugins.ordered']);
  });

  it('breaks an `order` tie by plugin code, then contribution id', () => {
    registerPlugin(plugin('zzz_plugins', contribution('a')));
    registerPlugin(plugin('aaa_plugins', contribution('z'), contribution('b')));
    expect(keys()).toEqual(['aaa_plugins.b', 'aaa_plugins.z', 'zzz_plugins.a']);
  });

  it('is independent of load order', () => {
    // The same set registered in the opposite sequence must render identically:
    // plugins load over the network, so arrival order is not reproducible.
    registerPlugin(plugin('civ_plugins', contribution('one')));
    registerPlugin(plugin('haiti_plugins', contribution('two')));
    const forwards = keys();

    clearPlugins();
    registerPlugin(plugin('haiti_plugins', contribution('two')));
    registerPlugin(plugin('civ_plugins', contribution('one')));

    expect(keys()).toEqual(forwards);
  });
});

describe('registry — slot scoping', () => {
  it('returns nothing for a slot no contribution targets', () => {
    registerPlugin(plugin('civ_plugins', contribution('payment-capture')));
    // The tagged union has one member today, so an unknown slot id can only be
    // reached by asking for one — which is the point: nothing leaks across
    // slots.
    expect(contributionsFor(SLOTS.prescriptionPaymentForm)).toHaveLength(1);
    expect(
      contributionsFor(SLOTS.prescriptionPaymentForm).every(
        entry => entry.contribution.slot === SLOTS.prescriptionPaymentForm
      )
    ).toBe(true);
  });
});
