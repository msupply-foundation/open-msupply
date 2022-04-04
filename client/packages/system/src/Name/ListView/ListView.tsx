import React, { FC } from 'react';
import {
  useNavigate,
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
} from '@openmsupply-client/common';
import { useNames, NameRowFragment } from '../api';

export const NameListView: FC<{ type: 'customer' | 'supplier' }> = ({
  type,
}) => {
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    isError,
    onChangePage,
    pagination,
    sortBy,
    onChangeSortBy,
  } = useNames(type);

  const columns = useColumns<NameRowFragment>(
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
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        isError={isError}
        onRowClick={row => {
          navigate(row.id);
        }}
      />
    </TableProvider>
  );
};
