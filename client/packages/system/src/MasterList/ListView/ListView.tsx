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
import { useMasterLists, MasterListRowFragment } from '../api';

export const MasterListListView: FC = () => {
  const {
    data,
    isError,
    isLoading,
    onChangePage,
    pagination,
    sortBy,
    onChangeSortBy,
    filter,
  } = useMasterLists();

  const navigate = useNavigate();
  const columns = useColumns<MasterListRowFragment>(
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
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => navigate(row.id)}
      />
    </TableProvider>
  );
};
