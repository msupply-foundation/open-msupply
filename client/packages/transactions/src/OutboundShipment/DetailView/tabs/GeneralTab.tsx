import {
  ColumnDefinition,
  Item,
  RemoteDataTable,
  useColumns,
  useDataTableApi,
} from '@openmsupply-client/common';
import React, { FC } from 'react';

interface GeneralTabProps<T> {
  data: T[];
}

const defaultColumns: ColumnDefinition<Item>[] = [
  {
    label: 'label.name',
    key: 'id',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    align: 'left',
  },
  {
    label: 'label.type',
    key: 'code',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    align: 'left',
  },
  {
    label: 'label.type',
    key: 'name',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    align: 'left',
  },
  {
    label: 'label.type',
    key: 'packSize',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    align: 'left',
  },
  {
    label: 'label.type',
    key: 'quantity',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    align: 'left',
  },
];

export const GeneralTab: FC<GeneralTabProps<Item>> = ({ data }) => {
  const columns = useColumns<Item>(defaultColumns);
  const tableApi = useDataTableApi<Item>();

  return (
    <RemoteDataTable
      sortBy={{ key: 'quantity', isDesc: false, direction: 'asc' }}
      pagination={{ first: 10, offset: 0, total: 10 }}
      tableApi={tableApi}
      columns={columns}
      data={data}
      onSortBy={() => {}}
      onChangePage={() => {}}
    />
  );
};
