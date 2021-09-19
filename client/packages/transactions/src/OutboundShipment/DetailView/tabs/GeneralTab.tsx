import {
  ColumnDefinition,
  Item,
  RemoteDataTable,
  SortRule,
  useColumns,
  useDataTableApi,
  usePagination,
  useQueryParams,
  useRowRenderCount,
  useSortBy,
} from '@openmsupply-client/common';
import React, { FC, useEffect, useState } from 'react';

interface GeneralTabProps<T> {
  data: T[];
}

const defaultColumns: ColumnDefinition<Item>[] = [
  {
    label: 'label.code',
    key: 'code',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    align: 'left',
  },
  {
    label: 'label.name',
    key: 'name',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    align: 'left',
  },
  {
    label: 'label.packSize',
    key: 'packSize',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    align: 'left',
  },
  {
    label: 'label.quantity',
    key: 'quantity',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    align: 'left',
  },
];

const parseValue = (object: any, key: string) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);

    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }
  return value;
};

const getDataSorter = (sortKey: string, desc: boolean) => (a: any, b: any) => {
  const valueA = parseValue(a, sortKey);
  const valueB = parseValue(b, sortKey);

  if (valueA < valueB) {
    return desc ? 1 : -1;
  }
  if (valueA > valueB) {
    return desc ? -1 : 1;
  }

  return 0;
};

const useSortedData = <T extends Record<string, unknown>>(data: T[]) => {
  const { sortBy, onChangeSortBy } = useSortBy('quantity');
  const [sortedData, setSortedData] = useState(data);

  const wrapped = (newSortKey: string) => {
    const newSortBy = onChangeSortBy(newSortKey);
    const sorter = getDataSorter(newSortBy.key, newSortBy.isDesc);

    setSortedData(data.sort(sorter));
  };

  return { sortedData, sortBy, onChangeSortBy: wrapped };
};

export const GeneralTab: FC<GeneralTabProps<Item>> = ({ data }) => {
  const columns = useColumns<Item>(defaultColumns);
  const tableApi = useDataTableApi<Item>();

  const { pagination } = useQueryParams<Item>('quantity');
  const { sortedData, onChangeSortBy, sortBy } = useSortedData(data);

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
    />
  );
};
