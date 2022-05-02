import {
  SortBy,
  FilterBy,
  ItemSortFieldInput,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';
import { StockRow } from '../types';

export type StockApi = ReturnType<typeof getSdk>;

export const getStockQueries = (stockApi: StockApi, storeId: string) => ({
  get: {
    list: async ({
      sortBy,
      filterBy,
    }: {
      first: number;
      offset: number;
      sortBy: SortBy<StockRow>;
      filterBy: FilterBy | null;
    }): Promise<{
      nodes: StockRow[];
      totalCount: number;
    }> => {
      const result = await stockApi.itemsWithStockLines({
        first: 1000,
        offset: 0,
        key: ItemSortFieldInput.Name,
        desc: sortBy.isDesc,
        filter: filterBy,
        storeId,
      });

      const items = result?.items;
      const nodes: StockRow[] = [];
      (items?.nodes || []).forEach(item => {
        const availableBatches = item.availableBatches;
        availableBatches.nodes
          .filter(batch => batch.totalNumberOfPacks > 0)
          .forEach(batch =>
            nodes.push({
              id: batch.id,
              itemCode: item.code,
              itemName: item.name,
              itemUnit: item.unitName ?? '',
              batch: batch.batch ?? '',
              expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
              packSize: batch.packSize,
              numberOfPacks: batch.totalNumberOfPacks,
              locationName: batch.locationName ?? '',
            })
          );
      });

      return { totalCount: nodes.length, nodes };
    },
  },
});
