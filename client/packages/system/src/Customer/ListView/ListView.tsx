import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableProvider,
  DataTable,
  useListData,
  Name,
  useColumns,
  createTableStore,
  useOmSupplyApi,
} from '@openmsupply-client/common';
import { getCustomerListViewApi } from './api';

export const ListView: FC = () => {
  const navigate = useNavigate();
  const { api } = useOmSupplyApi();
  const {
    totalCount,
    data,
    isLoading,
    onChangePage,
    pagination,
    sortBy,
    onChangeSortBy,
  } = useListData(
    { key: 'name' },
    ['names', 'list'],
    getCustomerListViewApi(api)
  );

  const columns = useColumns<Name>(['name', 'code'], {
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
          navigate(`/distribution/customer/${row.id}`);
        }}
      />
    </TableProvider>
  );
};
