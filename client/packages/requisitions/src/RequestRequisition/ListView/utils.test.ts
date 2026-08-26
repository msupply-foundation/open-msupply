import { getUniqueItemCountInStocktakeLines } from './utils';
import { RecentStocktakeItemsQuery } from '../api/operations.generated';

describe('getUniqueItemCount', () => {
  it('returns 0 for empty stocktake data', () => {
    const emptyData: RecentStocktakeItemsQuery['stocktakes']['nodes'] = [];
    expect(getUniqueItemCountInStocktakeLines(emptyData)).toBe(0);
  });

  it('counts unique items across a single stocktake', () => {
    const singleStocktakeData: RecentStocktakeItemsQuery['stocktakes']['nodes'] =
      [
        {
          __typename: 'StocktakeNode',
          lines: {
            __typename: 'StocktakeLineConnector',
            nodes: [
              { __typename: 'StocktakeLineNode', itemId: 'item-1' },
              { __typename: 'StocktakeLineNode', itemId: 'item-2' },
              { __typename: 'StocktakeLineNode', itemId: 'item-3' },
            ],
          },
        },
      ];

    expect(getUniqueItemCountInStocktakeLines(singleStocktakeData)).toBe(3);
  });

  it('deduplicates items within a single stocktake', () => {
    const stocktakeWithDuplicates: RecentStocktakeItemsQuery['stocktakes']['nodes'] =
      [
        {
          __typename: 'StocktakeNode',
          lines: {
            __typename: 'StocktakeLineConnector',
            nodes: [
              { __typename: 'StocktakeLineNode', itemId: 'item-1' },
              { __typename: 'StocktakeLineNode', itemId: 'item-1' },
              { __typename: 'StocktakeLineNode', itemId: 'item-2' },
            ],
          },
        },
      ];

    expect(getUniqueItemCountInStocktakeLines(stocktakeWithDuplicates)).toBe(2);
  });

  it('deduplicates items across multiple stocktakes', () => {
    const multipleStocktakesData: RecentStocktakeItemsQuery['stocktakes']['nodes'] =
      [
        {
          __typename: 'StocktakeNode',
          lines: {
            __typename: 'StocktakeLineConnector',
            nodes: [
              { __typename: 'StocktakeLineNode', itemId: 'item-1' },
              { __typename: 'StocktakeLineNode', itemId: 'item-2' },
            ],
          },
        },
        {
          __typename: 'StocktakeNode',
          lines: {
            __typename: 'StocktakeLineConnector',
            nodes: [
              { __typename: 'StocktakeLineNode', itemId: 'item-2' },
              { __typename: 'StocktakeLineNode', itemId: 'item-3' },
            ],
          },
        },
      ];

    expect(getUniqueItemCountInStocktakeLines(multipleStocktakesData)).toBe(3);
  });

  it('handles stocktakes with empty line nodes', () => {
    const stocktakeWithEmptyLines: RecentStocktakeItemsQuery['stocktakes']['nodes'] =
      [
        {
          __typename: 'StocktakeNode',
          lines: {
            __typename: 'StocktakeLineConnector',
            nodes: [],
          },
        },
        {
          __typename: 'StocktakeNode',
          lines: {
            __typename: 'StocktakeLineConnector',
            nodes: [{ __typename: 'StocktakeLineNode', itemId: 'item-1' }],
          },
        },
      ];

    expect(getUniqueItemCountInStocktakeLines(stocktakeWithEmptyLines)).toBe(1);
  });
});
