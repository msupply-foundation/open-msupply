import React, { FC } from 'react';
import {
  ColumnSetBuilder,
  RemoteDataTable,
  useColumns,
  getEditableQuantityColumn,
  SortRule,
  ObjectWithStringKeys,
  SortBy,
  usePagination,
  useRowRenderCount,
} from '@openmsupply-client/common';
import { ItemRow } from '../types';

interface GeneralTabProps<T extends ObjectWithStringKeys> {
  data: T[];
  onChangeSortBy: (sortBy: SortRule<T>) => void;
  sortBy: SortBy<T>;
}

export const GeneralTab: FC<GeneralTabProps<ItemRow>> = ({
  data,
  onChangeSortBy,
  sortBy,
}) => {
  const { pagination } = usePagination(useRowRenderCount());

  const defaultColumns = new ColumnSetBuilder<ItemRow>()
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
      data={data.slice(pagination.offset, pagination.offset + pagination.first)}
      onSortBy={onChangeSortBy}
      onChangePage={pagination.onChangePage}
      noDataMessageKey="error.no-items"
    />
  );
};
