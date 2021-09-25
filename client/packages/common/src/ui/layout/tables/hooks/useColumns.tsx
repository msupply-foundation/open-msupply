import React from 'react';
import { DomainObject } from '../../../../types/index';
import {
  ColumnDefinition,
  ColumnFormat,
  CellProps,
  HeaderProps,
  ColumnDataAccessor,
  ColumnAlign,
  Column,
} from '../columns/types';
import { useFormatDate, useTranslation } from '../../../../intl';
import { ReactJSXElement } from '@emotion/react/types/jsx-namespace';

const getColumnWidths = <T extends DomainObject>(
  column: ColumnDefinition<T>
) => {
  const minWidth = column.minWidth || column.width || 100;
  const width = column.width || 100;

  return { minWidth, width };
};

const applyDefaults = <T extends DomainObject>(
  column: ColumnDefinition<T>,
  defaultAccessor: (column: ColumnDefinition<T>) => ColumnDataAccessor<T>
): Column<T> => {
  const defaults: Omit<Column<T>, 'key'> = {
    label: '',
    format: ColumnFormat.text,
    sortable: true,
    Cell: BasicCell,
    Header: BasicHeader,
    accessor: defaultAccessor(column),
    sortType: getSortType(column),
    sortInverted: column.format === ColumnFormat.date,
    sortDescFirst: column.format === ColumnFormat.date,
    align: ColumnAlign.Left,
    ...getColumnWidths(column),
  };

  return { ...defaults, ...column };
};

export const useColumns = <T extends DomainObject>(
  columnsToMap: ColumnDefinition<T>[]
): Column<T>[] => {
  const formatDate = useFormatDate();

  return columnsToMap.map(column => {
    return applyDefaults(column, getAccessor(formatDate));
  });
};

const getSortType = (column: { format?: ColumnFormat }) => {
  switch (column.format) {
    case ColumnFormat.date:
      return 'datetime';
    case ColumnFormat.real:
    case ColumnFormat.integer:
      return 'numeric';
    default:
      return 'alphanumeric';
  }
};

type DateFormatter = (
  value: number | Date,
  options?: (Intl.DateTimeFormatOptions & { format?: string }) | undefined
) => string;

const getAccessor = <T extends DomainObject>(formatDate: DateFormatter) => {
  return (column: { format?: ColumnFormat; key: keyof T }) => {
    switch (column.format) {
      case ColumnFormat.date:
        return (row: T) => formatDate(new Date(`${row[column.key]}`));
      default:
        return (row: T) => row[column.key] as string;
    }
  };
};

const BasicCell = <T extends DomainObject>({
  column,
  rowData,
}: CellProps<T>): ReactJSXElement => {
  return <>{column.accessor(rowData)}</>;
};

const BasicHeader = <T extends DomainObject>({
  column,
}: HeaderProps<T>): ReactJSXElement => {
  const t = useTranslation();
  const header = column.label === '' ? column.label : t(column.label);

  return <>{header}</>;
};
