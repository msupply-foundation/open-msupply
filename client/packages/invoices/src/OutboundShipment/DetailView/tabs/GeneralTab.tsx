import React, { FC, useEffect } from 'react';
import {
  RemoteDataTable,
  ObjectWithStringKeys,
  SortBy,
  usePagination,
  useRowRenderCount,
  Column,
  DomainObject,
} from '@openmsupply-client/common';
import { ItemRow } from '../types';

interface GeneralTabProps<T extends ObjectWithStringKeys & DomainObject> {
  data: T[];
  columns: Column<T>[];
  sortBy: SortBy<T>;
}

export const GeneralTab: FC<GeneralTabProps<ItemRow>> = ({ data, columns }) => {
  const numberOfRows = useRowRenderCount();
  const { pagination } = usePagination(numberOfRows);

  useEffect(() => {
    pagination.onChangeFirst(numberOfRows);
  }, [numberOfRows, pagination.first]);

  return (
    <RemoteDataTable
      pagination={{ ...pagination, total: data.length }}
      columns={columns}
      data={data.slice(pagination.offset, pagination.offset + pagination.first)}
      onChangePage={pagination.onChangePage}
      noDataMessageKey="error.no-items"
    />
  );
};
