/*
 * The host's warning-suppression consult (spec/plugins/sdk-contract.md § the
 * warning-suppression slot; OMS-REG-REPL-04.86/.87): whether a published host
 * warning is suppressed — replaced by an installed plugin's own measure. What
 * is pinned here is the answer's SHAPE — no contribution answers false, any
 * contribution answering true wins, only contributions naming the consulted
 * warning are asked, and a failing contribution (its `when` included: the
 * consult has no render boundary over it) answers false for itself only,
 * recorded rather than thrown (rules § error isolation), so a plugin error
 * can never strip a store of the one measure it has — nor wedge the consulting
 * action by rejecting the consult.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { PLUGIN_API_VERSION } from '../plugin-sdk/apiVersion';
import { definePlugin } from '../plugin-sdk/definePlugin';
import type {
  AnyContribution,
  HostWarningId,
  SlotContext,
} from '../plugin-sdk/types';
import { pluginDiagnostics } from './diagnostics';
import { warningSuppressed } from './warningSuppression';
import { clearPlugins, registerPlugin } from './registry';

const suppressionPlugin = (
  code: string,
  suppresses: (ctx: SlotContext) => boolean | Promise<boolean>,
  when?: (ctx: SlotContext) => boolean,
  warning: HostWarningId = 'internalOrders.recentStocktake'
) => ({
  code,
  module: definePlugin({
    manifest: { code, version: '1.0.0', pluginApiVersion: PLUGIN_API_VERSION },
    contributions: [
      {
        slot: 'host.warningSuppression',
        id: 'suppression',
        warning,
        when,
        suppresses,
      } satisfies AnyContribution,
    ],
  }),
});

beforeEach(clearPlugins);

// Every consult in this suite targets the one published warning; the helper
// keeps each assertion on one line.
const consult = () => warningSuppressed('internalOrders.recentStocktake');

describe('warningSuppressed', () => {
  it('answers false with no plugin loaded — the warning is core’s alone', async () => {
    expect(await consult()).toBe(false);
  });

  it('answers false when every contribution answers false', async () => {
    registerPlugin(suppressionPlugin('alpha', () => false));
    expect(await consult()).toBe(false);
  });

  it('answers true when a contribution answers true, however the others answer', async () => {
    registerPlugin(suppressionPlugin('alpha', () => false));
    registerPlugin(suppressionPlugin('beta', () => Promise.resolve(true)));
    expect(await consult()).toBe(true);
  });

  it('never asks a contribution naming a different warning', async () => {
    // The consult is per-warning: a contribution suppressing one warning must
    // have no bearing on another, so its resolver is never even run. The
    // published set holds one id today, so the "other" id is cast — what is
    // pinned is the filter, not the catalogue.
    let asked = false;
    registerPlugin(
      suppressionPlugin(
        'alpha',
        () => {
          asked = true;
          return true;
        },
        undefined,
        'some.futureWarning' as HostWarningId
      )
    );
    expect(await consult()).toBe(false);
    expect(asked).toBe(false);
  });

  it('never asks a contribution its `when` hides', async () => {
    // The tests run with no store entered, so `storeMode` is undefined and a
    // positive mode gate is false — exactly the unresolved window the plugin's
    // own gate must not be consulted in.
    let asked = false;
    registerPlugin(
      suppressionPlugin(
        'alpha',
        () => {
          asked = true;
          return true;
        },
        ctx => ctx.storeMode === 'dispensary'
      )
    );
    expect(await consult()).toBe(false);
    expect(asked).toBe(false);
  });

  it('treats a throwing contribution as false for itself only, recorded in diagnostics', async () => {
    registerPlugin(
      suppressionPlugin('alpha', () => {
        throw new Error('schedule read failed');
      })
    );
    registerPlugin(suppressionPlugin('beta', () => true));
    expect(await consult()).toBe(true);
    const recorded = pluginDiagnostics().find(
      diagnostic => diagnostic.pluginCode === 'alpha'
    );
    expect(recorded?.level).toBe('error');
    expect(recorded?.message).toContain('alpha.suppression');
  });

  it('treats a rejecting contribution as false — a failing plugin never stands the warning down', async () => {
    registerPlugin(
      suppressionPlugin('alpha', () => Promise.reject(new Error('offline')))
    );
    expect(await consult()).toBe(false);
  });

  it('treats a throwing `when` as hidden for that contribution only — recorded, another still answers', async () => {
    // `when` is plugin code too, and the consult has no render boundary over
    // it: a throw must fail that contribution alone, never reject the consult
    // (which would wedge the consulting action's in-flight state) or silence
    // the other contributions' answers.
    registerPlugin(
      suppressionPlugin(
        'gamma',
        () => true,
        () => {
          throw new Error('bad session read');
        }
      )
    );
    registerPlugin(suppressionPlugin('delta', () => true));
    await expect(consult()).resolves.toBe(true);
    const recorded = pluginDiagnostics().find(
      diagnostic => diagnostic.pluginCode === 'gamma'
    );
    expect(recorded?.level).toBe('error');
    expect(recorded?.message).toContain('gamma.suppression');
  });

  it('answers false when the only contribution has a throwing `when` — the consult never rejects', async () => {
    registerPlugin(
      suppressionPlugin(
        'epsilon',
        () => true,
        () => {
          throw new Error('boom');
        }
      )
    );
    await expect(consult()).resolves.toBe(false);
  });
});
