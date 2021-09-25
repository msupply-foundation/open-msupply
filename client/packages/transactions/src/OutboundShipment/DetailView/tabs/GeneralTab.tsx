import {
  ColumnAlign,
  ColumnDefinition,
  Item,
  RemoteDataTable,
  useColumns,
  useDataTableApi,
  useQueryParams,
  useSortedData,
} from '@openmsupply-client/common';
import React, { FC } from 'react';

interface GeneralTabProps<T> {
  data: T[];
}

const defaultColumns: ColumnDefinition<Item>[] = [
  {
    label: 'label.code',
    key: 'code',
    width: 20,
  },
  {
    label: 'label.name',
    key: 'name',
    width: 100,
  },
  {
    label: 'label.packSize',
    key: 'packSize',
    width: 20,
    align: ColumnAlign.Right,
  },
  {
    label: 'label.quantity',
    key: 'quantity',
    width: 20,
    align: ColumnAlign.Right,
  },
];

export const GeneralTab: FC<GeneralTabProps<Item>> = ({ data }) => {
  const columns = useColumns<Item>(defaultColumns);
  const tableApi = useDataTableApi<Item>();

  const { pagination } = useQueryParams({ key: 'quantity' });
  const { sortedData, onChangeSortBy, sortBy } = useSortedData(data, {
    key: 'quantity',
  });

  return (
    <RemoteDataTable
      sortBy={sortBy}
      pagination={{ ...pagination, total: data.length }}
      tableApi={tableApi}
      columns={columns}
      data={sortedData.slice(
        pagination.offset,
        pagination.offset + pagination.first
      )}
      onSortBy={onChangeSortBy}
      onChangePage={pagination.onChangePage}
      noDataMessageKey="error.no-items"
    />
  );
};
