import { getCheckboxSelectionColumn } from './../columns/CheckboxSelectionColumn';
import { Column, IdType } from 'react-table';

import { useFormatDate, useTranslation } from '../../../../intl';
import { LocaleKey } from '../../../../intl/intlHelpers';

export enum ColumnFormat {
  date,
  integer,
  real,
  text,
}

export interface ColumnDefinition<T> {
  label: LocaleKey;
  format?: ColumnFormat;
  key: keyof T;
  sortable?: boolean; // defaults to true
}

interface ColumnOptions {
  useSelectionColumn: boolean;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const useColumns = <T extends object>(
  columnsToMap: ColumnDefinition<T>[],
  options: ColumnOptions = { useSelectionColumn: false }
): Column<T>[] => {
  const t = useTranslation();
  const formatDate = useFormatDate();

  let columns = columnsToMap.map(column => {
    const { key, label, sortable = true } = column;
    const Header = t(label);
    const accessor = getAccessor<T>(column, formatDate);
    const disableSortBy = !sortable;
    const sortType = getSortType<T>(column);
    const sortInverted = column.format === ColumnFormat.date;
    const sortDescFirst = column.format === ColumnFormat.date;

    return {
      accessor,
      disableSortBy,
      Header,
      id: key as IdType<T>,
      sortDescFirst,
      sortInverted,
      sortType,
      // TODO: Fix react-type column typings here
    } as any;
  });

  if (options.useSelectionColumn) {
    columns = [...columns, getCheckboxSelectionColumn()];
  }

  return columns;
};

const getSortType = <T>(column: ColumnDefinition<T>) => {
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

const getAccessor = <T>(
  column: ColumnDefinition<T>,
  formatDate: (
    value: number | Date,
    options?:
      | (Intl.DateTimeFormatOptions & { format?: string | undefined })
      | undefined
  ) => string
) => {
  switch (column.format) {
    case ColumnFormat.date:
      return (row: T) => formatDate(new Date(`${row[column.key]}`));
    default:
      return (row: T) => row[column.key];
  }
};
