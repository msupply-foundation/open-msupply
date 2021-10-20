import { DependencyList, useMemo } from 'react';
import { DomainObject } from '../../../../types/index';
import {
  ColumnDefinition,
  ColumnFormat,
  ColumnAlign,
  Column,
} from '../columns/types';
import { useFormatDate, useFormatNumber } from '../../../../intl';
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
  const columnDefinitions = new ColumnDefinitionSetBuilder<T>()
    .addColumns(columnsToCreate)
    .build();

  return useMemo(
    () =>
      columnDefinitions.map(column => {
        const defaults: Omit<Column<T>, 'key'> = {
          label: '',
          format: ColumnFormat.Text,
          sortable: true,
          Cell: BasicCell,
          Header: BasicHeader,
          accessor: getDefaultAccessor<T>(column),
          sortType: getSortType(column),
          sortInverted: column.format === ColumnFormat.Date,
          sortDescFirst: column.format === ColumnFormat.Date,
          align: ColumnAlign.Left,
          onChangeSortBy: options?.onChangeSortBy,
          sortBy: options?.sortBy,
          formatter: getDefaultFormatter<T>(column),
          ...getColumnWidths(column),
        };

        return { ...defaults, ...column };
      }),
    [depsArray]
  );
};

const getSortType = (column: { format?: ColumnFormat }) => {
  switch (column.format) {
    case ColumnFormat.Date:
      return 'datetime';
    case ColumnFormat.Currency:
    case ColumnFormat.Real:
    case ColumnFormat.Integer:
      return 'numeric';
    default:
      return 'alphanumeric';
  }
};

const getDefaultAccessor =
  <T extends DomainObject>(column: ColumnDefinition<T>) =>
  (row: T) => {
    return row[column.key] as string;
  };

const getDefaultFormatter = <T extends DomainObject>(
  column: ColumnDefinition<T>
) => {
  switch (column.format) {
    case ColumnFormat.Date: {
      return (date: unknown) => {
        const formatDate = useFormatDate();
        return formatDate(new Date(date as string));
      };
    }
    case ColumnFormat.Currency: {
      return (value: unknown) => {
        if (Number.isNaN(value)) return '';

        const formatNumber = useFormatNumber();
        // TODO: fetch currency symbol or use style: 'currency'
        return `$${formatNumber(Number(value))}`;
      };
    }
    default: {
      return (value: unknown) => String(value);
    }
  }
};
