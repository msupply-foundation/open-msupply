import { DependencyList, useMemo } from 'react';
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
import { SortBy } from '../../../..';
import { ColumnDefinitionSetBuilder, ColumnKey } from '..';

const getColumnWidths = <T extends DomainObject>(
  column: ColumnDefinition<T>
) => {
  const minWidth = column.minWidth || column.width || 100;
  const width = column.width || 100;

  return { minWidth, width };
};

interface ColumnOptions<T extends DomainObject> {
  onChangeSortBy?: (column: Column<T>) => void;
  sortBy?: SortBy<T>;
}

// TODO: Currently columns won't update if they're changed.
// This will need to change when we add functionality to
// add/remove columns.
export const useColumns = <T extends DomainObject>(
  columnsToCreate: (
    | ColumnDefinition<T>
    | ColumnKey
    | [ColumnKey | ColumnDefinition<T>, Omit<ColumnDefinition<T>, 'key'>]
    | [ColumnKey]
  )[],
  options?: ColumnOptions<T>,
  depsArray: DependencyList = []
): Column<T>[] => {
  const formatDate = useFormatDate();
  const defaultAccessor = getAccessor<T>(formatDate);

  const columnDefinitions = new ColumnDefinitionSetBuilder<T>()
    .addColumns(columnsToCreate)
    .build();

  return useMemo(
    () =>
      columnDefinitions.map(column => {
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
          sortBy: options?.sortBy,
          ...getColumnWidths(column),
        };

        return { ...defaults, ...column };
      }),
    [depsArray]
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
