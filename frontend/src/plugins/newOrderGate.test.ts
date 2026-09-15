/*
 * The host's consult of the new-order gate (spec/plugins/sdk-contract.md §
 * the new-order gate slot; OMS-REG-REPL-04.86/.87): whether the store-wide
 * recent-stocktake warning is superseded by an installed plugin's item-level
 * measure. What is pinned here is the answer's SHAPE — no gate answers false,
 * any gate answering true wins, and a failing gate (its `when` included: the
 * consult has no render boundary over it) answers false for itself only,
 * recorded rather than thrown (rules § error isolation), so a plugin error
 * can never strip a store of the one measure it has — nor wedge the New-order
 * action by rejecting the consult.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { PLUGIN_API_VERSION } from '../plugin-sdk/apiVersion';
import { definePlugin } from '../plugin-sdk/definePlugin';
import type { AnyContribution, SlotContext } from '../plugin-sdk/types';
import { pluginDiagnostics } from './diagnostics';
import { newOrderWarningSuperseded } from './newOrderGate';
import { clearPlugins, registerPlugin } from './registry';

const gatePlugin = (
  code: string,
  supersedes: (ctx: SlotContext) => boolean | Promise<boolean>,
  when?: (ctx: SlotContext) => boolean
) => ({
  code,
  module: definePlugin({
    manifest: { code, version: '1.0.0', pluginApiVersion: PLUGIN_API_VERSION },
    contributions: [
      {
        slot: 'internalOrders.newOrderGate',
        id: 'gate',
        when,
        supersedes,
      } satisfies AnyContribution,
    ],
  }),
});

beforeEach(clearPlugins);

describe('newOrderWarningSuperseded', () => {
  it('answers false with no plugin loaded — the warning is core’s alone', async () => {
    expect(await newOrderWarningSuperseded()).toBe(false);
  });

  it('answers false when every gate answers false', async () => {
    registerPlugin(gatePlugin('alpha', () => false));
    expect(await newOrderWarningSuperseded()).toBe(false);
  });

  it('answers true when a gate answers true, however the others answer', async () => {
    registerPlugin(gatePlugin('alpha', () => false));
    registerPlugin(gatePlugin('beta', () => Promise.resolve(true)));
    expect(await newOrderWarningSuperseded()).toBe(true);
  });

  it('never asks a gate its `when` hides', async () => {
    // The tests run with no store entered, so `storeMode` is undefined and a
    // positive mode gate is false — exactly the unresolved window the plugin's
    // own gate must not be consulted in.
    let asked = false;
    registerPlugin(
      gatePlugin(
        'alpha',
        () => {
          asked = true;
          return true;
        },
        ctx => ctx.storeMode === 'dispensary'
      )
    );
    expect(await newOrderWarningSuperseded()).toBe(false);
    expect(asked).toBe(false);
  });

  it('treats a throwing gate as false for itself only, recorded in diagnostics', async () => {
    registerPlugin(
      gatePlugin('alpha', () => {
        throw new Error('schedule read failed');
      })
    );
    registerPlugin(gatePlugin('beta', () => true));
    expect(await newOrderWarningSuperseded()).toBe(true);
    const recorded = pluginDiagnostics().find(
      diagnostic => diagnostic.pluginCode === 'alpha'
    );
    expect(recorded?.level).toBe('error');
    expect(recorded?.message).toContain('alpha.gate');
  });

  it('treats a rejecting gate as false — a failing plugin never stands the warning down', async () => {
    registerPlugin(
      gatePlugin('alpha', () => Promise.reject(new Error('offline')))
    );
    expect(await newOrderWarningSuperseded()).toBe(false);
  });

  it('treats a throwing `when` as hidden for that gate only — recorded, another gate still answers', async () => {
    // `when` is plugin code too, and the consult has no render boundary over
    // it: a throw must fail that gate alone, never reject the consult (which
    // would wedge the New-order button's in-flight state) or silence the
    // other gates' answers.
    registerPlugin(
      gatePlugin(
        'gamma',
        () => true,
        () => {
          throw new Error('bad session read');
        }
      )
    );
    registerPlugin(gatePlugin('delta', () => true));
    await expect(newOrderWarningSuperseded()).resolves.toBe(true);
    const recorded = pluginDiagnostics().find(
      diagnostic => diagnostic.pluginCode === 'gamma'
    );
    expect(recorded?.level).toBe('error');
    expect(recorded?.message).toContain('gamma.gate');
  });

  it('answers false when the only gate has a throwing `when` — the consult never rejects', async () => {
    registerPlugin(
      gatePlugin(
        'epsilon',
        () => true,
        () => {
          throw new Error('boom');
        }
      )
    );
    await expect(newOrderWarningSuperseded()).resolves.toBe(false);
  });
});
