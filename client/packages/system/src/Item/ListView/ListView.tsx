import { Environment } from '@openmsupply-client/config';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableProvider,
  DataTable,
  useListData,
  Item,
  useColumns,
  ListApi,
  createTableStore,
  SortBy,
  getSdk,
  GraphQLClient,
  ItemSortFieldInput,
} from '@openmsupply-client/common';

const client = new GraphQLClient(Environment.API_URL);
const api = getSdk(client);

const listQueryFn = async ({
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

  const { items } = await api.items({
    first,
    offset,
    key,
    desc: sortBy.isDesc,
  });

  if (items.__typename === 'ItemConnector') {
    const itemRows: Item[] = items.nodes.map(item => ({
      ...item,
      availableQuantity: 0,
      unit: '',
      availableBatches:
        item.availableBatches.__typename === 'StockLineConnector'
          ? item.availableBatches.nodes
          : [],
    }));

    return {
      totalCount: items.totalCount,
      nodes: itemRows,
    };
  }
  throw new Error(items.error.description);
};

const Api: ListApi<Item> = {
  onQuery:
    ({ first, offset, sortBy }) =>
    () =>
      listQueryFn({ first, offset, sortBy }),
  onDelete: () => null,
  onUpdate: () => null,
  onCreate: () => null,
};

export const ListView: FC = () => {
  const {
    totalCount,
    data,
    isLoading,
    onChangePage,
    pagination,
    sortBy,
    onChangeSortBy,
  } = useListData({ key: 'NAME' }, ['items', 'list'], Api);
  const navigate = useNavigate();

  const columns = useColumns<Item>(['name', 'code'], {
    sortBy,
    onChangeSortBy,
  });

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        pagination={{ ...pagination, total: totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/catalogue/items/${row.id}`);
        }}
      />
    </TableProvider>
  );
};
