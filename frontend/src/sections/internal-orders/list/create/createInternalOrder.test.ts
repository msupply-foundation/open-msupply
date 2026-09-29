/*
 * The shared New-order gate decision (spec/internal-orders rules § creation,
 * OMS-REG-REPL-04.45). Every entry point — the list's New order and the
 * dashboard's Order more — rides this one composition, so what is pinned is
 * the decision itself: the warning shows when recent stocktakes are
 * insufficient, and a failed stocktake read never blocks creation.
 *
 * NO plugin suppression is consulted (#822, reverting #505). A registered
 * suppression contribution is kept as a fixture precisely to pin that: the
 * gate must ignore it, because the per-item measure it deferred to has been
 * withdrawn. The slot itself still exists in the SDK and is tested by
 * warningSuppression.test.ts; nothing in core asks it about this warning.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphqlFetch } from '@/api/graphql';
import { PLUGIN_API_VERSION } from '@/plugin-sdk/apiVersion';
import { definePlugin } from '@/plugin-sdk/definePlugin';
import type { AnyContribution } from '@/plugin-sdk/types';
import { clearPlugins, registerPlugin } from '@/plugins/registry';
import { recentStocktakeGateShows } from './createInternalOrder';

vi.mock('@/api/graphql', () => ({
  graphqlFetch: vi.fn(),
  msSinceLastGqlCall: vi.fn(() => 0),
  isForbidden: vi.fn(() => false),
  missingPermissions: vi.fn(() => []),
  reportPermissionDenied: vi.fn(),
}));
const fetchMock = vi.mocked(graphqlFetch);

// Minimal wire payload: only what the distinct-item fold reads. The cast is
// the test's trusted seam (the real shape is codegen-validated end to end).
const stocktakesCovering = (...itemIds: string[][]) =>
  ({
    kind: 'success',
    data: {
      stocktakes: {
        __typename: 'StocktakeConnector',
        nodes: itemIds.map((items, index) => ({
          id: `stocktake-${index}`,
          lines: { nodes: items.map(itemId => ({ itemId })) },
        })),
      },
    },
  }) as never;

const suppressionPlugin = (code: string, answer: boolean) => ({
  code,
  module: definePlugin({
    manifest: { code, version: '1.0.0', pluginApiVersion: PLUGIN_API_VERSION },
    contributions: [
      {
        slot: 'host.warningSuppression',
        id: 'suppression',
        warning: 'internalOrders.recentStocktake',
        suppresses: () => answer,
      } satisfies AnyContribution,
    ],
  }),
});

beforeEach(() => {
  clearPlugins();
  fetchMock.mockReset();
});

const gateShows = () => recentStocktakeGateShows('store-a', 90, 2);

describe('recentStocktakeGateShows', () => {
  it('shows when recent stocktakes are insufficient', async () => {
    fetchMock.mockResolvedValue(stocktakesCovering(['item-1']));
    expect(await gateShows()).toBe(true);
  });

  it('does not show when recent stocktakes cover enough distinct items', async () => {
    // Two stocktakes, three lines, but distinct items are what count — the
    // duplicate never inflates coverage.
    fetchMock.mockResolvedValue(
      stocktakesCovering(['item-1', 'item-2'], ['item-2'])
    );
    expect(await gateShows()).toBe(false);
  });

  it('shows even where a plugin suppression contribution answers true — no suppression is consulted (#822)', async () => {
    fetchMock.mockResolvedValue(stocktakesCovering());
    registerPlugin(suppressionPlugin('alpha', true));
    expect(await gateShows()).toBe(true);
  });

  it('never blocks creation on a failed stocktake read', async () => {
    fetchMock.mockResolvedValue({
      kind: 'error',
      error: { kind: 'network' },
    } as never);
    expect(await gateShows()).toBe(false);
  });
});
