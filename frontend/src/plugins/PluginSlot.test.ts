import { createMemo, createRoot } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnyContribution, SlotContext } from '../plugin-sdk/types';

/*
 * `when` gating in `visibleContributions`, the one filter every rendered slot
 * region reads (dashboard regions, internal-order columns and panels, the
 * payment form, the document form slots, the patient toolbar triggers). The
 * registry runs for real; the session facts `when` reads are the one mocked
 * edge, held in a signal so a test can change them under a live memo.
 *
 * A gate is plugin code running in the host region's own memo, outside the
 * error boundary each contribution renders in, so these pin both halves: a
 * gate answers exactly as before, and one that throws hides its own
 * contribution and nothing else.
 *
 * eslint-disable solid/reactivity -- the region's memo is read by hand here;
 * there is no JSX to read it from, and each read is the assertion.
 */
/* eslint-disable solid/reactivity */

vi.mock('./slotContext', async () => {
  const { createSignal } = await import('solid-js');
  const [storeId, setStoreId] = createSignal<string | undefined>('store-a');
  return {
    setStoreId,
    slotContext: (): SlotContext => ({
      storeId: storeId(),
      storeCode: undefined,
      userId: undefined,
      permissions: [],
      storeMode: undefined,
      storePreferences: {
        useConsumptionAndStockFromCustomersForInternalOrders: false,
        monthsUnderstock: undefined,
      },
    }),
  };
});

import { definePlugin } from '../plugin-sdk/definePlugin';
import { PLUGIN_API_VERSION } from '../plugin-sdk/apiVersion';
import { clearPlugins, registerPlugin } from './registry';
import { pluginDiagnostics } from './diagnostics';
import { visibleContributions } from './PluginSlot';
import * as slotContextModule from './slotContext';

const setStoreId = (
  slotContextModule as unknown as {
    setStoreId: (id: string | undefined) => void;
  }
).setStoreId;

const Component = () => null;
const PANEL = 'replenishment.internal-order';

const stat = (
  id: string,
  when?: (ctx: SlotContext) => unknown,
  panel = PANEL
): AnyContribution =>
  ({
    slot: 'dashboard.stat',
    id,
    panel,
    Component,
    ...(when ? { when } : {}),
  }) as AnyContribution;

const register = (code: string, contributions: AnyContribution[]) =>
  registerPlugin({
    code,
    module: definePlugin({
      manifest: {
        code,
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      contributions,
    }),
  });

const visibleIds = (container?: string) =>
  visibleContributions('dashboard.stat', container).map(c => c.id);

const throwing = () => {
  throw new Error('deliberate');
};

beforeEach(() => {
  clearPlugins();
  setStoreId('store-a');
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('visibleContributions: gates that answer', () => {
  it('shows a contribution with no gate or a passing one, and hides a failing one', () => {
    register('alpha', [
      stat('open'),
      stat('passes', () => true),
      stat('fails', () => false),
    ]);
    expect(visibleIds()).toEqual(['open', 'passes']);
  });

  it('reads a gate by truthiness, as a JS-authored plugin may return a non-boolean', () => {
    register('alpha', [
      stat('a-string', () => 'yes'),
      stat('b-number', () => 1),
      stat('c-zero', () => 0),
      stat('d-empty', () => ''),
      stat('e-undefined', () => undefined),
    ]);
    expect(visibleIds()).toEqual(['a-string', 'b-number']);
  });

  it('still narrows to a container after the gates', () => {
    register('alpha', [
      stat('here', () => true),
      stat('elsewhere', () => true, 'some.other-panel'),
      stat('hidden-here', () => false),
    ]);
    expect(visibleIds(PANEL)).toEqual(['here']);
  });
});

describe('visibleContributions: a gate that throws', () => {
  it('hides that contribution alone, keeping the rest in registry order', () => {
    register('alpha', [stat('a-first'), stat('b-broken', throwing)]);
    register('beta', [stat('c-last', () => true)]);
    expect(visibleIds()).toEqual(['a-first', 'c-last']);
  });

  it('does not throw out of the region memo it runs in', () => {
    register('alpha', [stat('ok'), stat('broken', throwing)]);
    const ids = createRoot(dispose => {
      const region = createMemo(() => visibleIds());
      const read = region();
      dispose();
      return read;
    });
    expect(ids).toEqual(['ok']);
  });

  it('is named in diagnostics once, however often the region recomputes', () => {
    const before = pluginDiagnostics().length;
    register('alpha', [stat('named-once', throwing)]);
    visibleIds();
    visibleIds();
    visibleIds();
    expect(pluginDiagnostics().slice(before)).toEqual([
      {
        level: 'error',
        pluginCode: 'alpha',
        message:
          'dashboard.stat "alpha.named-once" when gate threw (Error: deliberate) — hidden',
      },
    ]);
  });

  it('shows the contribution again once its gate stops throwing', () => {
    register('alpha', [
      stat('needs-store', ctx => {
        if (ctx.storeId === undefined) throw new Error('no store yet');
        return true;
      }),
    ]);
    createRoot(dispose => {
      const region = createMemo(() => visibleIds());
      setStoreId(undefined);
      expect(region()).toEqual([]);
      setStoreId('store-a');
      expect(region()).toEqual(['needs-store']);
      dispose();
    });
  });

  it("leaves the same plugin's contributions in other slots alone", () => {
    register('alpha', [
      stat('broken', throwing),
      {
        slot: 'dashboard.widget',
        id: 'widget',
        Component,
        when: () => true,
      } as AnyContribution,
    ]);
    expect(visibleIds()).toEqual([]);
    expect(visibleContributions('dashboard.widget').map(c => c.id)).toEqual([
      'widget',
    ]);
  });
});
