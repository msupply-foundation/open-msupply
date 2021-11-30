import {
  mockItemsListViewQuery,
  mockItemsWithStockLinesQuery,
} from '@openmsupply-client/common/src/types';
import { ResolverService } from '../../../api/resolvers';

const mockItemsListView = mockItemsListViewQuery((req, res, ctx) => {
  const { variables } = req;
  const result = ResolverService.item.list(variables);

  return res(ctx.data({ items: result }));
});

const mockItemsWithStockLines = mockItemsWithStockLinesQuery(
  (req, res, ctx) => {
    const { variables } = req;

    const result = ResolverService.item.list(variables);

    return res(
      ctx.data({
        items: {
          ...result,
          nodes: result.nodes.map(item => ({
            ...item,
            availableBatches: {
              ...item.availableBatches,
              nodes: item.availableBatches.nodes.map(availableBatch => ({
                ...availableBatch,
                __typename: 'StockLineNode',
              })),
            },
          })),
        },
      })
    );
  }
);

export const ItemHandlers = [mockItemsListView, mockItemsWithStockLines];
