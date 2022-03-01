import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useNavigate,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { MasterListRow } from '../types';
import { useMasterLists } from '../api';

export const MasterListListView: FC = () => {
  const {
    data,
    isLoading,
    onChangePage,
    pagination,
    sortBy,
    onChangeSortBy,
    filter,
  } = useMasterLists();

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
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        onRowClick={row => navigate(`/inventory/master-lists/${row.id}`)}
      />
    </TableProvider>
  );
};
