import { sortNodes } from './utils';

describe('sorts nodes on sortBy', () => {
  it('returns unsorted nodes when no key provided', () => {
    expect(
      sortNodes(
        [
          { expiryDate: 1 },
          { expiryDate: 3 },
          { expiryDate: 2 },
          { expiryDate: 5 },
        ],
        undefined,
        'asc'
      )
    ).toEqual([
      { expiryDate: 1 },
      { expiryDate: 3 },
      { expiryDate: 2 },
      { expiryDate: 5 },
    ]);
  });
  it('returns sorting on other value', () => {
    expect(
      sortNodes(
        [{ batch: 1 }, { batch: 3 }, { batch: 2 }, { batch: 5 }],
        'batch',
        'desc'
      )
    ).toEqual([{ batch: 5 }, { batch: 3 }, { batch: 2 }, { batch: 1 }]);
  });
  it('returns sorting on nested value item.name', () => {
    expect(
      sortNodes(
        [
          {
            expiryDate: 1,
            item: {
              name: 'a',
            },
          },
          {
            expiryDate: 3,
            item: {
              name: 'd',
            },
          },
          {
            expiryDate: 2,
            item: {
              name: 'b',
            },
          },
          {
            expiryDate: 5,
            item: {
              name: 'c',
            },
          },
        ],
        'item.name',
        'asc'
      )
    ).toEqual([
      {
        expiryDate: 1,
        item: {
          name: 'a',
        },
      },

      {
        expiryDate: 2,
        item: {
          name: 'b',
        },
      },
      {
        expiryDate: 5,
        item: {
          name: 'c',
        },
      },
      {
        expiryDate: 3,
        item: {
          name: 'd',
        },
      },
    ]);
  });
  it('returns sorting on sort when no dir is provided and defaults to desc', () => {
    expect(
      sortNodes([{ code: 1 }, { code: 3 }, { code: 2 }, { code: 5 }], 'code')
    ).toEqual([{ code: 5 }, { code: 3 }, { code: 2 }, { code: 1 }]);
  });
});
