import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableProvider,
  DataTable,
  useListData,
  Name,
  useColumns,
  createTableStore,
} from '@openmsupply-client/common';
import { CustomerListViewApi } from './api';

export const ListView: FC = () => {
  const {
    totalCount,
    data,
    isLoading,
    onChangePage,
    pagination,
    sortBy,
    onChangeSortBy,
  } = useListData({ key: 'name' }, ['names', 'list'], CustomerListViewApi);
  const navigate = useNavigate();

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
