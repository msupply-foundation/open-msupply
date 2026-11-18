import { createRoot } from 'solid-js';
import { createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLegacyTableImport,
  getUserTableConfig,
  setLegacyTableImport,
  setUserTableConfig,
} from '../appData';
import { importLegacyTables } from './importLegacyTables';
import {
  createLegacyTableImport,
  LEGACY_TABLE_KEY_PREFIX,
  needsLegacyTableImport,
} from './legacyTableImportState';
import { legacyTableImportVersion } from './legacyTableImportVersion';

/*
 * The one-time import of the React front end's personal table layouts
 * (#2072): when it runs, what it writes, and what it leaves alone. The node
 * test environment has no localStorage, so each test gets an empty one.
 */

const createStorage = (): Storage => {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    key: index => [...items.keys()][index] ?? null,
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, String(value)),
    removeItem: key => void items.delete(key),
    clear: () => items.clear(),
  };
};

const setOldLayout = (tableId: string, layout: unknown) =>
  localStorage.setItem(
    `${LEGACY_TABLE_KEY_PREFIX}${tableId}`,
    JSON.stringify(layout)
  );

// In the real map: stock-movement-detail → stock-movement-lines, with
// groupRows, and stocktake-list → stocktakes.
const OLD_STOCK_MOVEMENT = {
  columnOrder: ['stockLine.item.code', 'numberOfPacks'],
  grouping: ['stockLine.item.code'],
};
const IMPORTED_STOCK_MOVEMENT = {
  base: { columnOrder: ['itemCode', 'numberOfPacks'], groupRows: true },
};

const settle = () => new Promise<void>(resolve => setTimeout(resolve));

beforeEach(() => vi.stubGlobal('localStorage', createStorage()));
afterEach(() => vi.unstubAllGlobals());

describe('needsLegacyTableImport', () => {
  it('is false once the user has imported, even with old layouts (OMS-REG-LGN-01.35)', () => {
    setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
    setLegacyTableImport('user-1', 1);
    expect(needsLegacyTableImport('user-1')).toBe(false);
  });

  it('with no old layouts on the device, is false, and writes nothing', () => {
    expect(needsLegacyTableImport('user-1')).toBe(false);
    expect(getLegacyTableImport('user-1')).toBeUndefined();
  });

  it('with old layouts and no flag, is true', () => {
    setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
    expect(needsLegacyTableImport('user-1')).toBe(true);
  });

  it('is per user', () => {
    setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
    setLegacyTableImport('user-1', 1);
    expect(needsLegacyTableImport('user-2')).toBe(true);
  });
});

describe('importLegacyTables', () => {
  it("stores the converted layouts under base as the user's own, and marks the import done", () => {
    setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
    importLegacyTables('user-1');
    expect(getUserTableConfig('user-1', 'stock-movement-lines')).toEqual(
      IMPORTED_STOCK_MOVEMENT
    );
    expect(getLegacyTableImport('user-1')).toBeGreaterThan(0);
  });

  it('skips a table the user has already set up, in either band, and imports the rest (OMS-REG-LGN-01.34)', () => {
    setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
    setOldLayout('stocktake-list', { columnOrder: ['status'] });
    const mine = { compact: { viewMode: 'card' as const } };
    setUserTableConfig('user-1', 'stock-movement-lines', mine);

    importLegacyTables('user-1');

    expect(getUserTableConfig('user-1', 'stock-movement-lines')).toEqual(mine);
    expect(getUserTableConfig('user-1', 'stocktakes')).toEqual({
      base: { columnOrder: ['status'] },
    });
  });

  it("imports into one user's layouts only", () => {
    setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
    importLegacyTables('user-1');
    expect(getUserTableConfig('user-2', 'stock-movement-lines')).toEqual({});
    expect(getLegacyTableImport('user-2')).toBeUndefined();
  });

  it('leaves the old layouts in place for the React front end (OMS-REG-LGN-01.33)', () => {
    setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
    importLegacyTables('user-1');
    expect(
      localStorage.getItem(`${LEGACY_TABLE_KEY_PREFIX}stock-movement-detail`)
    ).toBe(JSON.stringify(OLD_STOCK_MOVEMENT));
  });

  it('skips an old layout that is not valid JSON', () => {
    localStorage.setItem(`${LEGACY_TABLE_KEY_PREFIX}stocktake-list`, '{oops');
    setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
    importLegacyTables('user-1');
    expect(getUserTableConfig('user-1', 'stocktakes')).toEqual({});
    expect(getUserTableConfig('user-1', 'stock-movement-lines')).toEqual(
      IMPORTED_STOCK_MOVEMENT
    );
  });
});

describe('createLegacyTableImport', () => {
  it('is ready at once when there is nothing to import, without running the import', () =>
    createRoot(async dispose => {
      const runImport = vi.fn(() => Promise.resolve());
      const legacyImport = createLegacyTableImport(() => 'user-1', runImport);
      expect(legacyImport.ready()).toBe(true);
      await settle();
      expect(runImport).not.toHaveBeenCalled();
      expect(getLegacyTableImport('user-1')).toBe(0);
      dispose();
    }));

  it('holds back until the import has run, then is ready with the layouts stored', () =>
    createRoot(async dispose => {
      setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
      const legacyImport = createLegacyTableImport(() => 'user-1');
      expect(legacyImport.ready()).toBe(false);

      await vi.waitFor(() => expect(legacyImport.ready()).toBe(true));
      expect(getUserTableConfig('user-1', 'stock-movement-lines')).toEqual(
        IMPORTED_STOCK_MOVEMENT
      );
      dispose();
    }));

  it('runs again for a different user signing in, without holding the open app back (OMS-REG-LGN-01.35, OMS-REG-LGN-01.36)', () =>
    createRoot(async dispose => {
      setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
      setLegacyTableImport('user-1', 1);
      const [userId, setUserId] = createSignal('user-1');
      const runImport = vi.fn(async (id: string) => importLegacyTables(id));
      const legacyImport = createLegacyTableImport(userId, runImport);
      expect(legacyImport.ready()).toBe(true);
      const versionBefore = legacyTableImportVersion();

      setUserId('user-2');
      expect(legacyImport.ready()).toBe(true);
      await vi.waitFor(() =>
        expect(legacyTableImportVersion()).toBe(versionBefore + 1)
      );
      expect(legacyImport.ready()).toBe(true);
      expect(runImport).toHaveBeenCalledTimes(1);
      expect(runImport).toHaveBeenCalledWith('user-2');
      expect(getUserTableConfig('user-2', 'stock-movement-lines')).toEqual(
        IMPORTED_STOCK_MOVEMENT
      );
      dispose();
    }));

  it('opens anyway when the import fails, and runs it again at the next sign-in', () =>
    createRoot(async dispose => {
      setOldLayout('stock-movement-detail', OLD_STOCK_MOVEMENT);
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const legacyImport = createLegacyTableImport(
        () => 'user-1',
        () => Promise.reject(new Error('chunk failed to load'))
      );
      await vi.waitFor(() => expect(legacyImport.ready()).toBe(true));
      expect(getLegacyTableImport('user-1')).toBeUndefined();
      expect(needsLegacyTableImport('user-1')).toBe(true);
      consoleError.mockRestore();
      dispose();

      // The next sign-in mounts the gate afresh.
      await createRoot(async disposeNext => {
        const nextSignIn = createLegacyTableImport(() => 'user-1');
        expect(nextSignIn.ready()).toBe(false);
        await vi.waitFor(() => expect(nextSignIn.ready()).toBe(true));
        expect(getLegacyTableImport('user-1')).toBeGreaterThan(0);
        disposeNext();
      });
    }));
});
