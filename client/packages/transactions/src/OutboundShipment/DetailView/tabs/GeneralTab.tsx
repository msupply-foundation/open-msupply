import {
  ColumnSetBuilder,
  Item,
  RemoteDataTable,
  useColumns,
  useQueryParams,
  useSortedData,
  getEditableQuantityColumn,
} from '@openmsupply-client/common';
import React, { FC } from 'react';

interface GeneralTabProps<T> {
  data: T[];
}

export const GeneralTab: FC<GeneralTabProps<Item>> = ({ data }) => {
  const { pagination } = useQueryParams({ key: 'quantity' });
  const { sortedData, onChangeSortBy, sortBy } = useSortedData(data ?? [], {
    key: 'quantity',
  });

  const defaultColumns = new ColumnSetBuilder<Item>()
    .addColumn('code')
    .addColumn('name')
    .addColumn('packSize')
    .addColumn(getEditableQuantityColumn())
    .build();

  const columns = useColumns(defaultColumns);

  return (
    <RemoteDataTable
      sortBy={sortBy}
      pagination={{ ...pagination, total: data.length }}
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
