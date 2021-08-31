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

export const useColumns =
  () =>
  <T extends Record<string, unknown>>(
    columns: ColumnDefinition<T>[]
  ): Column<T>[] => {
    const t = useTranslation();
    const formatDate = useFormatDate();

    return columns.map(column => {
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
      };
    });
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
