import React, { FC } from 'react';
import {
  useNavigate,
  TableProvider,
  DataTable,
  useListData,
  Name,
  useColumns,
  createTableStore,
  useOmSupplyApi,
  useAuthState,
} from '@openmsupply-client/common';
import { getNameListViewApi } from './api';

export const NameListView: FC<{ type: 'customer' | 'supplier' }> = ({
  type,
}) => {
  const { storeId } = useAuthState();
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
    { initialSortBy: { key: 'name' } },
    ['names', 'list'],
    getNameListViewApi(api, type, storeId)
  );

  const columns = useColumns<Name>(
    ['name', 'code'],
    {
      sortBy,
      onChangeSortBy,
    },
    [sortBy]
  );

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        pagination={{ ...pagination, total: totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(row.id);
        }}
      />
    </TableProvider>
  );
};
