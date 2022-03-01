import React, { FC } from 'react';
import {
  useNavigate,
  TableProvider,
  DataTable,
  Name,
  useColumns,
  createTableStore,
} from '@openmsupply-client/common';
import { useNames } from '../api';

export const NameListView: FC<{ type: 'customer' | 'supplier' }> = ({
  type,
}) => {
  const navigate = useNavigate();
  const { data, isLoading, onChangePage, pagination, sortBy, onChangeSortBy } =
    useNames(type);

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
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(row.id);
        }}
      />
    </TableProvider>
  );
};
