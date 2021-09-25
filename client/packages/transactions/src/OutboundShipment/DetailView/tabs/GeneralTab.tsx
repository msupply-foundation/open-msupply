import {
  ColumnSetBuilder,
  Item,
  RemoteDataTable,
  useColumns,
  useQueryParams,
  useSortedData,
} from '@openmsupply-client/common';
import React, { FC } from 'react';

interface GeneralTabProps<T> {
  data: T[];
}

const defaultColumns = new ColumnSetBuilder<Item>()
  .addColumn('code')
  .addColumn('name')
  .addColumn('packSize')
  .addColumn('quantity')
  .build();

export const GeneralTab: FC<GeneralTabProps<Item>> = ({ data }) => {
  const columns = useColumns(defaultColumns);

  const { pagination } = useQueryParams({ key: 'quantity' });
  const { sortedData, onChangeSortBy, sortBy } = useSortedData(data, {
    key: 'quantity',
  });

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
