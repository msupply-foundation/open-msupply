import {
  Item,
  ListApi,
  SortBy,
  ItemSortFieldInput,
  ItemsQuery,
  StockLineConnector,
  ConnectorError,
  OmSupplyApi,
} from '@openmsupply-client/common';

const itemsGuard = (itemsQuery: ItemsQuery) => {
  if (itemsQuery.items.__typename === 'ItemConnector') {
    return itemsQuery.items;
  }

  throw new Error(itemsQuery.items.error.description);
};

const availableBatchesGuard = (
  availableBatches: StockLineConnector | ConnectorError
) => {
  if (availableBatches.__typename === 'StockLineConnector') {
    return availableBatches.nodes;
  }

  throw new Error(availableBatches.error.description);
};

const onRead =
  (api: OmSupplyApi) =>
  async ({
    first,
    offset,
    sortBy,
  }: {
    first: number;
    offset: number;
    sortBy: SortBy<Item>;
  }): Promise<{
    nodes: Item[];
    totalCount: number;
  }> => {
    // TODO: Need to add a `sortByKey` to the Column type
    const key =
      sortBy.key === 'name' ? ItemSortFieldInput.Name : ItemSortFieldInput.Code;

    const result = await api.items({
      first,
      offset,
      key,
      desc: sortBy.isDesc,
    });

    const items = itemsGuard(result);

    const nodes: Item[] = items.nodes.map(item => ({
      ...item,
      availableBatches: availableBatchesGuard(item.availableBatches),
    }));

    return { totalCount: items.totalCount, nodes };
  };

export const getItemListViewApi = (api: OmSupplyApi): ListApi<Item> => ({
  onRead:
    ({ first, offset, sortBy }) =>
    () =>
      onRead(api)({ first, offset, sortBy }),
  onDelete: () => null,
  onUpdate: () => null,
  onCreate: () => null,
});
