import { Environment } from '@openmsupply-client/config';
import {
  Item,
  ListApi,
  SortBy,
  getSdk,
  GraphQLClient,
  ItemSortFieldInput,
  ItemsQuery,
  StockLineConnector,
  ConnectorError,
} from '@openmsupply-client/common';

const client = new GraphQLClient(Environment.API_URL);
const api = getSdk(client);

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

const onRead = async ({
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
    availableQuantity: 0,
    unit: '',
    availableBatches: availableBatchesGuard(item.availableBatches),
  }));

  return { totalCount: items.totalCount, nodes };
};

export const ItemListViewApi: ListApi<Item> = {
  onRead:
    ({ first, offset, sortBy }) =>
    () =>
      onRead({ first, offset, sortBy }),
  onDelete: () => null,
  onUpdate: () => null,
  onCreate: () => null,
};
