import { getGroupedRows } from './utils';

describe('getGroupedRows', () => {
  const mockT = () => '[multiple]';

  it('should return original data when no groupByField is provided', () => {
    const data = [
      { name: 'Item 1', category: 'A' },
      { name: 'Item 2', category: 'A' },
    ];

    const result = getGroupedRows(true, data, undefined, mockT);

    expect(result).toEqual(data);
  });
  it('should return original data when isGrouped is false', () => {
    const data = [
      { name: 'Item 1', category: 'A' },
      { name: 'Item 2', category: 'A' },
    ];

    const result = getGroupedRows(false, data, 'category', mockT);
    expect(result).toEqual(data);
  });

  it('should return single row as-is when group contains only one item', () => {
    const data = [
      { name: 'Item 1', category: 'A' },
      { name: 'Item 2', category: 'B' },
    ];

    const result = getGroupedRows(true, data, 'category', mockT);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Item 1', category: 'A' });
    expect(result[1]).toEqual({ name: 'Item 2', category: 'B' });
  });

  it('should create summary row with subRows when group has [multiple] items', () => {
    const data = [
      { name: 'Item 1', category: 'A', price: 10 },
      { name: 'Item 2', category: 'A', price: 20 },
    ];

    const result = getGroupedRows(true, data, 'category', mockT);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: '[multiple]',
      category: 'A', // Same value for all items in group
      price: '[multiple]',
      subRows: [
        { name: 'Item 1', category: 'A', price: 10, isSubRow: true },
        { name: 'Item 2', category: 'A', price: 20, isSubRow: true },
      ],
    });
  });

  it('should preserve equal values in summary row', () => {
    const data = [
      { name: 'Item 1', category: 'A', status: 'active' },
      { name: 'Item 2', category: 'A', status: 'active' },
      { name: 'Item 3', category: 'A', status: 'active' },
    ];

    const result = getGroupedRows(true, data, 'category', mockT);

    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe('active'); // Should preserve equal value
    expect(result[0]!.category).toBe('A'); // Grouping field should be preserved
  });

  it('should handle object values correctly', () => {
    const data = [
      { category: 'A', details: null },
      { category: 'A', details: { type: 'small', color: 'red' } },
      { category: 'A', details: { type: 'large', color: 'red' } },
    ];

    const result = getGroupedRows(true, data, 'category', mockT);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      category: 'A',
      details: {
        type: '[multiple]',
        color: '[multiple]',
      },
      subRows: expect.any(Array),
    });
  });

  it('should handle mixed groups with single and [multiple] items', () => {
    const data = [
      { name: 'Item 1', category: 'A' },
      { name: 'Item 2', category: 'B' },
      { name: 'Item 3', category: 'B' },
      { name: 'Item 4', category: 'C' },
    ];

    const result = getGroupedRows(true, data, 'category', mockT);

    expect(result).toEqual([
      // Single item group A
      { name: 'Item 1', category: 'A' },

      // [multiple] item group B
      {
        name: '[multiple]',
        category: 'B',
        subRows: [
          { name: 'Item 2', category: 'B', isSubRow: true },
          { name: 'Item 3', category: 'B', isSubRow: true },
        ],
      },

      // Single item group C
      { name: 'Item 4', category: 'C' },
    ]);
  });
});
