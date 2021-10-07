import { useMemo } from 'react';
import { DomainObject } from '../../../../types/index';
import {
  ColumnDefinition,
  ColumnFormat,
  ColumnDataAccessor,
  ColumnAlign,
  Column,
} from '../columns/types';
import { useFormatDate } from '../../../../intl';
import { BasicCell, BasicHeader } from '../components';

const getColumnWidths = <T extends DomainObject>(
  column: ColumnDefinition<T>
) => {
  const minWidth = column.minWidth || column.width || 100;
  const width = column.width || 100;

  return { minWidth, width };
};

interface ColumnOptions<T extends DomainObject> {
  onChangeSortBy: (column: Column<T>) => void;
}

export const useColumns = <T extends DomainObject>(
  columnsToMap: ColumnDefinition<T>[],
  options?: ColumnOptions<T>
): Column<T>[] => {
  const formatDate = useFormatDate();
  const defaultAccessor = getAccessor<T>(formatDate);

  return useMemo(
    () =>
      columnsToMap.map(column => {
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
          onChangeSortBy: options?.onChangeSortBy,
          ...getColumnWidths(column),
        };

        return { ...defaults, ...column };
      }),
    []
  );
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

const getAccessor = <T extends DomainObject>(
  formatDate: DateFormatter
): ((column: {
  format?: ColumnFormat;
  key: keyof T;
}) => ColumnDataAccessor<T>) => {
  return column => {
    switch (column.format) {
      case ColumnFormat.date:
        return (row: T) => formatDate(new Date(`${row[column.key]}`));
      default:
        return (row: T) => row[column.key] as string;
    }
  };
};
