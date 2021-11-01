import React, { FC } from 'react';
import {
  DataTable,
  ObjectWithStringKeys,
  usePagination,
  Column,
  DomainObject,
} from '@openmsupply-client/common';
import { ItemRow } from '../types';

interface GeneralTabProps<T extends ObjectWithStringKeys & DomainObject> {
  data: T[];
  columns: Column<T>[];
}

export const GeneralTabComponent: FC<GeneralTabProps<ItemRow>> = ({
  data,
  columns,
}) => {
  const { pagination } = usePagination(20);

  return (
    <DataTable
      pagination={{ ...pagination, total: data.length }}
      columns={columns}
      data={data.slice(pagination.offset, pagination.offset + pagination.first)}
      onChangePage={pagination.onChangePage}
      noDataMessageKey="error.no-items"
    />
  );
};

export const GeneralTab = React.memo(GeneralTabComponent);
