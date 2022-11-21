import {
  SortBy,
  FilterBy,
  StockLineNode,
  StockLineSortFieldInput,
} from '@openmsupply-client/common';
import { getSdk, StockLineRowFragment } from './operations.generated';

export type StockApi = ReturnType<typeof getSdk>;

const stockLineParsers = {
  toSortField: (sortBy: SortBy<StockLineNode>): StockLineSortFieldInput => {
    switch (sortBy.key) {
      case 'numberOfPacks':
        return StockLineSortFieldInput.NumberOfPacks;
      case 'expiryDate':
      default: {
        return StockLineSortFieldInput.ExpiryDate;
      }
    }
  },
};

export const getStockQueries = (stockApi: StockApi, storeId: string) => ({
  get: {
    byId: async (id: string) => {
      const result = await stockApi.stockLine({ id, storeId });
      const stockLine = result?.stockLines.nodes[0];

      if (stockLine?.__typename === 'StockLineNode') {
        return stockLine;
      } else {
        throw new Error('Could not find stock line');
      }
    },
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: {
      first: number;
      offset: number;
      sortBy: SortBy<StockLineNode>;
      filterBy: FilterBy | null;
    }): Promise<{
      nodes: StockLineRowFragment[];
      totalCount: number;
    }> => {
      const result = await stockApi.stockLines({
        storeId,
        first: first,
        offset: offset,
        key: stockLineParsers.toSortField(sortBy),
        desc: sortBy.isDesc,
        filter: filterBy,
      });
      const { nodes, totalCount } = result?.stockLines;
      return { nodes, totalCount };
    },
  },
});
