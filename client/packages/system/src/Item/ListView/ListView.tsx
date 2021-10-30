import { Environment } from '@openmsupply-client/config';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableProvider,
  DataTable,
  useListData,
  request,
  Item,
  gql,
  useColumns,
  ListApi,
  createTableStore,
  SortBy,
  useContentAreaHeight,
} from '@openmsupply-client/common';

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
  const key = sortBy.key === 'name' ? 'NAME' : 'CODE';

  const { items } = await request(
    Environment.API_URL,
    gql`
      query items(
        $first: Int
        $offset: Int
        $key: ItemSortFieldInput!
        $desc: Boolean
      ) {
        items(
          page: { first: $first, offset: $offset }
          sort: { key: $key, desc: $desc }
        ) {
          ... on ItemConnector {
            totalCount
            nodes {
              id
              code
              availableBatches {
                ... on StockLineConnector {
                  nodes {
                    availableNumberOfPacks
                    batch
                    costPricePerPack
                    expiryDate
                    id
                    itemId
                    packSize
                    sellPricePerPack
                    storeId
                    totalNumberOfPacks
                  }
                }
                ... on ConnectorError {
                  __typename
                  error {
                    description
                  }
                }
              }
              isVisible
              name
            }
          }
        }
      }
    `,
    {
      first,
      offset,
      key,
      desc: sortBy.isDesc,
    }
  );

  return { nodes: items.nodes, totalCount: items.totalCount };
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
  const contentHeight = useContentAreaHeight();
  const tableHeight = contentHeight - 40;
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
        height={tableHeight}
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
