import {
  ListApi,
  SortBy,
  ItemSortFieldInput,
  OmSupplyApi,
  FilterBy,
} from '@openmsupply-client/common';
import { availableBatchesGuard, itemsGuard } from '../../Item/utils';
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

    const items = itemsGuard(result);
    const nodes: StockRow[] = [];
    items.nodes.forEach(item => {
      const availableBatches = availableBatchesGuard(item.availableBatches);
      availableBatches
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

export const getStockListViewApi = (api: OmSupplyApi): ListApi<StockRow> => ({
  onRead:
    ({ first, offset, sortBy, filterBy, storeId }) =>
    () =>
      onRead(api)({ first, offset, sortBy, filterBy, storeId }),
  onDelete: async () => [''],
  onUpdate: async () => '',
  onCreate: async () => '',
});
