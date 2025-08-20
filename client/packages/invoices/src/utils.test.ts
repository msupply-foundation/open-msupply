import { InvoiceLineNodeType } from '@common/types';
import { getNextItemId, isInboundPlaceholderRow } from './utils';
import { InboundLineFragment } from './InboundShipment';

describe('getNextItemId', () => {
  it('gets next item in array', () => {
    const rows = [{ itemId: '1' }, { itemId: '2' }, { itemId: '3' }];
    const itemId = '1';
    expect(getNextItemId(rows, itemId)).toBe('2');
  });

  it('gets next item in array if many with same item id', () => {
    const rows = [
      { itemId: '1' },
      { itemId: '1' },
      { itemId: '1' },
      { itemId: '2' },
      { itemId: '3' },
    ];
    const itemId = '1';
    expect(getNextItemId(rows, itemId)).toBe('2');
  });

  it('gets correct next item when same item id appears later in array', () => {
    const rows = [
      { itemId: '1' },
      { itemId: '1' },
      { itemId: '2' },
      { itemId: '1' },
      { itemId: '3' },
    ];

    expect(getNextItemId(rows, '1')).toBe('2');
    expect(getNextItemId(rows, '2')).toBe('3');
    expect(getNextItemId(rows, '3')).toBeUndefined();
  });
});

describe('isInboundPlaceholderRow', () => {
  it('returns true for placeholder rows', () => {
    const row = {
      type: InvoiceLineNodeType.StockIn,
      numberOfPacks: 0,
      shippedNumberOfPacks: 0,
    } as InboundLineFragment;
    expect(isInboundPlaceholderRow(row)).toBe(true);
  });
  it('returns false when has some received packs', () => {
    const row = {
      type: InvoiceLineNodeType.StockIn,
      numberOfPacks: 1,
      shippedNumberOfPacks: 0,
    } as InboundLineFragment;
    expect(isInboundPlaceholderRow(row)).toBe(false);
  });
  it('returns false when has some shipped packs', () => {
    const row = {
      type: InvoiceLineNodeType.StockIn,
      numberOfPacks: 0,
      shippedNumberOfPacks: 1,
    } as InboundLineFragment;
    expect(isInboundPlaceholderRow(row)).toBe(false);
  });
});
