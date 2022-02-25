import {
  ListApi,
  SortBy,
  ItemSortFieldInput,
  OmSupplyApi,
  FilterBy,
} from '@openmsupply-client/common';
import { StockRow } from '../types';
const onRead =
  (api: OmSupplyApi) =>
  async ({
    sortBy,
    filterBy,
    storeId,
  }: {
    first: number;
    offset: number;
    sortBy: SortBy<StockRow>;
    filterBy: FilterBy | null;
    storeId: string;
  }): Promise<{
    nodes: StockRow[];
    totalCount: number;
  }> => {
    const result = await api.itemsWithStockLines({
      first: 1000,
      offset: 0,
      key: ItemSortFieldInput.Name,
      desc: sortBy.isDesc,
      filter: filterBy,
      storeId,
    });

    const items = result.items;
    const nodes: StockRow[] = [];
    items.nodes.forEach(item => {
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
  };

export const getStockListViewApi = (
  api: OmSupplyApi,
  storeId: string
): ListApi<StockRow> => ({
  onRead:
    ({ first, offset, sortBy, filterBy }) =>
    () =>
      onRead(api)({ first, offset, sortBy, filterBy, storeId }),
  onDelete: async () => [''],
  onUpdate: async () => '',
  onCreate: async () => '',
});
