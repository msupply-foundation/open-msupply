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
} from '@openmsupply-client/common';

const listQueryFn = async (): Promise<{
  nodes: Item[];
  totalCount: number;
}> => {
  const { items } = await request(
    Environment.API_URL,
    gql`
      query items {
        items {
          ... on ItemConnector {
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
    `
  );

  return { nodes: items.nodes, totalCount: items.totalCount };
};

const Api: ListApi<Item> = {
  onQuery: () => listQueryFn,
  onDelete: () => null,
  onUpdate: () => null,
  onCreate: () => null,
};

export const ListView: FC = () => {
  const {
    totalCount,
    data,
    isLoading,
    numberOfRows,
    onChangePage,
    pagination,
  } = useListData({ key: 'name' }, ['items', 'list'], Api);
  const navigate = useNavigate();

  const columns = useColumns<Item>(['name', 'code']);

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        pagination={{ ...pagination, total: totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.slice(0, numberOfRows) || []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/catalogue/items/${row.id}`);
        }}
      />
    </TableProvider>
  );
};
