import { getNextItemId } from './utils';

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
