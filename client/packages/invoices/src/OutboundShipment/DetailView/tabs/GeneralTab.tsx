import React, { FC } from 'react';
import {
  DataTable,
  ObjectWithStringKeys,
  usePagination,
  Column,
  DomainObject,
  useContentAreaHeight,
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
  const tableHeight = useContentAreaHeight();
  const { pagination } = usePagination(20);

  // This accounts for the pagination below the table and the row of buttons
  // and status.
  const heightOffset = 110;

  return (
    <DataTable
      height={tableHeight - heightOffset}
      pagination={{ ...pagination, total: data.length }}
      columns={columns}
      data={data.slice(pagination.offset, pagination.offset + pagination.first)}
      onChangePage={pagination.onChangePage}
      noDataMessageKey="error.no-items"
    />
  );
};

export const GeneralTab = React.memo(GeneralTabComponent);
