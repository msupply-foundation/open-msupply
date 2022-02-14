import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useOmSupplyApi,
  useListData,
  useNavigate,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { getMasterListListViewApi } from './api';
import { AppBarButtons } from './AppBarButtons';
import { MasterListRow } from '../types';

export const MasterListListView: FC = () => {
  const { api } = useOmSupplyApi();
  const {
    totalCount,
    data,
    isLoading,
    onChangePage,
    pagination,
    sortBy,
    onChangeSortBy,
    filter,
  } = useListData(
    { initialSortBy: { key: 'name' } },
    ['master-list', 'list'],
    getMasterListListViewApi(api)
  );
  console.info('filter', filter);
  const navigate = useNavigate();
  const columns = useColumns<MasterListRow>(
    ['code', 'name', 'description'],
    {
      onChangeSortBy,
      sortBy,
    },
    [onChangeSortBy, sortBy]
  );

  return (
    <TableProvider createStore={createTableStore}>
      <Toolbar filter={filter} />
      <AppBarButtons />
      <DataTable
        pagination={{ ...pagination, total: totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        onRowClick={row => navigate(`/inventory/master-lists/${row.id}`)}
      />
    </TableProvider>
  );
};
