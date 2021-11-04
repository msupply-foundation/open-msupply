import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableProvider,
  DataTable,
  useListData,
  Item,
  useColumns,
  createTableStore,
  useOmSupplyApi,
} from '@openmsupply-client/common';
import { getItemListViewApi } from './api';

export const ListView: FC = () => {
  const { api } = useOmSupplyApi();
  const {
    totalCount,
    data,
    isLoading,
    onChangePage,
    pagination,
    sortBy,
    onChangeSortBy,
  } = useListData({ key: 'name' }, ['items', 'list'], getItemListViewApi(api));
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
