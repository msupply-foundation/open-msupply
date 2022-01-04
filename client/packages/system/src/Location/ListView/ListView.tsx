import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
} from '@openmsupply-client/common';
import { useLocationList } from './api';

export const LocationListView: FC = () => {
  const { pagination, onChangePage, data, isLoading, onChangeSortBy } =
    useLocationList();

  const columns = useColumns(['code', 'name'], { onChangeSortBy }, []);

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
      />
    </TableProvider>
  );
};
