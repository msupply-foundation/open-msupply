import { useColumnUtils } from './ColumnUtils';
import { renderHookWithProvider } from '@common/utils';

type StockOutLineFragment = {
  id: string;
  batch?: string | null;
  expiryDate?: string | null;
  numberOfPacks: number;
  item: {
    id: string;
    name: string;
    code: string;
    unitName?: string | null;
  };
};
type StockOutItem = {
  id: string;
  itemId: string;
  lines: StockOutLineFragment[];
};

describe('getColumnProperty', () => {
  const stockRow1: StockOutLineFragment = {
    id: '1',
    batch: 'batch1',
    numberOfPacks: 10,
    expiryDate: '2020-01-01',
    item: { id: 'item1', name: 'Item One', code: 'code1', unitName: 'capsule' },
  };
  const stockRow2: StockOutLineFragment = {
    id: '2',
    batch: 'batch2',
    numberOfPacks: 5,
    item: { id: 'item1', name: 'Item One', code: 'code1', unitName: 'capsule' },
  };

  const groupedRow: StockOutItem = {
    id: '1',
    itemId: '1',
    lines: [stockRow1, stockRow2],
  };

  it('handles invalid input', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnProperty } = result.result.current;
    const row = stockRow1 as StockOutItem | StockOutLineFragment;

    const value1 = getColumnProperty(row, [{ path: [], default: '' }]);
    const value2 = getColumnProperty(row, [{ path: ['lines'] }]);
    const value3 = getColumnProperty(row, [{ path: [] }]);

    expect(value1).toBe(undefined);
    expect(value2).toBe(undefined);
    expect(value3).toBe(undefined);
  });

  it('extracts top level prop values', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnProperty } = result.result.current;
    const row = stockRow1 as StockOutItem | StockOutLineFragment;

    const value = getColumnProperty(row, [
      { path: ['lines', 'expiryDate'], default: '' },
      { path: ['expiryDate'], default: '' },
    ]);

    expect(value).toBe('2020-01-01');
  });

  it('handles defaults', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnProperty } = result.result.current;
    const row = stockRow2 as StockOutItem | StockOutLineFragment;

    const value = getColumnProperty(row, [
      { path: ['lines', 'expiryDate'], default: '' },
      { path: ['item', 'expiryDate'], default: 'defaultValue' },
    ]);

    expect(value).toBe('defaultValue');
  });

  it('extracts second level prop values', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnProperty } = result.result.current;
    const row = stockRow1 as StockOutItem | StockOutLineFragment;

    const value = getColumnProperty(row, [
      { path: ['lines', 'item', 'code'], default: '' },
      { path: ['item', 'code'], default: '' },
    ]);

    expect(value).toBe('code1');
  });

  it('defaults to [multiple] for lines', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnProperty } = result.result.current;
    const row = groupedRow as StockOutItem | StockOutLineFragment;

    const value = getColumnProperty(row, [
      { path: ['lines', 'batch'] },
      { path: ['batch'] },
    ]);

    expect(value).toBe('[multiple]');
  });

  it('returns "" when when there are no matching lines and no default', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnProperty } = result.result.current;
    const row = {
      id: '1',
      itemId: '1',
      lines: [],
    } as StockOutItem | StockOutLineFragment;

    const value = getColumnProperty(row, [
      { path: ['lines', 'item', 'code'] },
      { path: ['item', 'code'] },
    ]);

    expect(value).toBe('');
  });

  it('uses supplied default for lines', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnProperty } = result.result.current;
    const row = groupedRow as StockOutItem | StockOutLineFragment;

    const value = getColumnProperty(row, [
      { path: ['lines', 'batch'], default: 'different' },
      { path: ['batch'] },
    ]);

    expect(value).toBe('different');
  });

  it('returns the same for grouped lines', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnProperty } = result.result.current;
    const row = groupedRow as StockOutItem | StockOutLineFragment;

    const value = getColumnProperty(row, [
      { path: ['lines', 'item', 'id'] },
      { path: ['item', 'id'] },
    ]);

    expect(value).toBe('item1');
  });

  it('returns the correct type of the property', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnProperty } = result.result.current;
    const row = stockRow1 as StockOutItem | StockOutLineFragment;

    const value = getColumnProperty(row, [
      { path: ['lines', 'numberOfPacks'], default: '' },
      { path: ['numberOfPacks'], default: '' },
    ]);

    expect(value).toBe(10);
  });
});

describe('getColumnPropertyAsString', () => {
  const stockRow1: StockOutLineFragment = {
    id: '1',
    batch: 'batch1',
    numberOfPacks: 10,
    expiryDate: '2020-01-01',
    item: { id: 'item1', name: 'Item One', code: 'code1', unitName: 'capsule' },
  };

  it('handles invalid input', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnPropertyAsString } = result.result.current;
    const row = stockRow1 as StockOutItem | StockOutLineFragment;

    const value = getColumnPropertyAsString(row, [{ path: ['lines'] }]);

    expect(value).toBe('');
  });

  it('extracts top level prop values', () => {
    const result = renderHookWithProvider(useColumnUtils);
    const { getColumnPropertyAsString } = result.result.current;
    const row = stockRow1 as StockOutItem | StockOutLineFragment;

    const value = getColumnPropertyAsString(row, [
      { path: ['lines', 'numberOfPacks'], default: '' },
      { path: ['numberOfPacks'], default: '' },
    ]);

    expect(value).toBe('10');
  });
});
