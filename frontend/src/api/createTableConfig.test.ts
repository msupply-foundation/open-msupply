import { createRoot } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LayeredConfig } from '../ui/elements/table/tableConfig';

/*
 * The shared table-layout layer's wire (#2072). This UI keeps its shared
 * layouts in global_table_default_configs; the React front end keeps its own,
 * in a different shape and under different table ids, in global_table_configs.
 * What is under test is that this UI reads and writes only its own preference,
 * so a save here can never overwrite the React front end's layouts.
 * graphqlFetch is mocked at the module seam, with the store, user, server role
 * and breakpoint it reads.
 */

vi.mock('./graphql', () => ({ graphqlFetch: vi.fn() }));
vi.mock('../store/storeContext', () => ({
  currentStoreId: () => 'store-1',
  hasPermission: () => true,
}));
vi.mock('../auth/authContext', () => ({ currentUserId: () => 'user-1' }));
vi.mock('./serverInfo', () => ({ isCentralServer: () => true }));
vi.mock('../ui/utils/createMediaQuery', () => ({
  createMediaQuery: () => () => false,
}));
vi.mock('../appData', async () => ({
  isEmptyLayeredConfig: (
    await vi.importActual<typeof import('../appData')>('../appData')
  ).isEmptyLayeredConfig,
  getUserTableConfig: vi.fn(),
  setUserTableConfig: vi.fn(),
}));

type Document = { query: string };
type Call = [Document, Record<string, unknown>];

// The module keeps ONE store-scoped resource for every table, so each test
// imports a fresh copy (with fresh mocks) to start from an empty cache.
const load = async (shared: Record<string, LayeredConfig>) => {
  vi.resetModules();
  const { graphqlFetch } = await import('./graphql');
  const appData = await import('../appData');
  const { createTableConfig } = await import('./createTableConfig');
  const fetchMock = vi.mocked(graphqlFetch);
  fetchMock.mockImplementation((async (document: Document) =>
    document.query.includes('mutation')
      ? {
          kind: 'success',
          data: {
            centralServer: { preferences: { upsertPreferences: { ok: true } } },
          },
        }
      : {
          kind: 'success',
          data: { preferences: { globalTableDefaultConfigs: shared } },
        }) as unknown as typeof graphqlFetch);
  const calls = () => fetchMock.mock.calls as unknown as Call[];
  return {
    createTableConfig,
    getUserTableConfig: vi.mocked(appData.getUserTableConfig),
    calls,
  };
};

const settle = () => new Promise<void>(resolve => setTimeout(resolve));

describe('createTableConfig shared layouts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the shared layer from globalTableDefaultConfigs', async () => {
    const { createTableConfig, getUserTableConfig, calls } = await load({
      'stock-list': { base: { viewMode: 'card' } },
    });
    getUserTableConfig.mockReturnValue({});

    await createRoot(async dispose => {
      const table = createTableConfig({ tableId: 'stock-list' });
      table.config(); // arms the shared fetch
      await settle();

      expect(table.config().viewMode).toBe('card');
      const [document, variables] = calls()[0];
      expect(document.query).toContain('globalTableDefaultConfigs');
      expect(document.query).not.toMatch(/globalTableConfigs\b/);
      expect(variables).toEqual({ storeId: 'store-1' });
      dispose();
    });
  });

  it('saves the whole map, with this table spliced in, as globalTableDefaultConfigs only', async () => {
    const other: LayeredConfig = { base: { viewDensity: 'compact' } };
    const { createTableConfig, getUserTableConfig, calls } = await load({
      'other-table': other,
      'stock-list': { base: { viewMode: 'card' } },
    });
    const mine: LayeredConfig = { base: { columnOrder: ['itemName'] } };
    getUserTableConfig.mockReturnValue(mine);

    await createRoot(async dispose => {
      const table = createTableConfig({ tableId: 'stock-list' });
      table.config();
      await settle();

      expect(await table.saveGlobalTableConfig()).toBe(true);

      const save = calls().find(([document]) =>
        document.query.includes('mutation')
      );
      expect(save?.[1]).toEqual({
        storeId: 'store-1',
        input: {
          globalTableDefaultConfigs: {
            'other-table': other,
            'stock-list': mine,
          },
        },
      });
      dispose();
    });
  });

  it("drops this table's key when its layout is back at the defaults", async () => {
    const other: LayeredConfig = { base: { viewDensity: 'compact' } };
    const { createTableConfig, getUserTableConfig, calls } = await load({
      'other-table': other,
      'stock-list': { base: { viewMode: 'card' } },
    });
    getUserTableConfig.mockReturnValue({});

    await createRoot(async dispose => {
      const table = createTableConfig({ tableId: 'stock-list' });
      table.config();
      await settle();

      await table.saveGlobalTableConfig();

      const save = calls().find(([document]) =>
        document.query.includes('mutation')
      );
      expect(save?.[1]).toEqual({
        storeId: 'store-1',
        input: { globalTableDefaultConfigs: { 'other-table': other } },
      });
      dispose();
    });
  });
});
