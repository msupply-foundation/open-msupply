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
import { ColumnDefinitionSetBuilder, ColumnKey, ColumnDataAccessor } from '..';

const getColumnWidths = <T extends DomainObject>(
  column: ColumnDefinition<T>
) => {
  const minWidth = column.minWidth || column.width || 100;
  const width = column.width || 100;

  return { minWidth, width };
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
  <T extends DomainObject>(
    column: ColumnDefinition<T>
  ): ColumnDataAccessor<T> =>
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

const getDefaultColumnAlign = <T extends DomainObject>(
  column: ColumnDefinition<T>
) => {
  const { format } = column;

  switch (format) {
    case ColumnFormat.Date: {
      return ColumnAlign.Right;
    }
    case ColumnFormat.Currency: {
      return ColumnAlign.Right;
    }
    case ColumnFormat.Integer: {
      return ColumnAlign.Right;
    }
    case ColumnFormat.Real: {
      return ColumnAlign.Right;
    }
    case ColumnFormat.Text: {
      return ColumnAlign.Left;
    }
  }

  return ColumnAlign.Left;
};

interface ColumnOptions<T extends DomainObject> {
  onChangeSortBy?: (column: Column<T>) => void;
  sortBy?: SortBy<T>;
}

type ColumnDescription<T extends DomainObject> =
  | ColumnDefinition<T>
  | ColumnKey
  | [ColumnKey | ColumnDefinition<T>, Omit<ColumnDefinition<T>, 'key'>]
  | [ColumnKey];

export const createColumnWithDefaults = <T extends DomainObject>(
  column: ColumnDefinition<T>,
  options?: ColumnOptions<T>
): Column<T> => {
  const defaults: Omit<Column<T>, 'key'> = {
    label: '',
    format: ColumnFormat.Text,

    Cell: BasicCell,
    Header: BasicHeader,

    sortable: true,
    sortInverted: column.format === ColumnFormat.Date,
    sortDescFirst: column.format === ColumnFormat.Date,

    onChangeSortBy: options?.onChangeSortBy,
    sortBy: options?.sortBy,

    accessor: getDefaultAccessor<T>(column),
    sortType: getSortType(column),
    align: getDefaultColumnAlign(column),
    formatter: getDefaultFormatter<T>(column),

    ...getColumnWidths(column),
  };

  return { ...defaults, ...column };
};

export const createColumns = <T extends DomainObject>(
  columnsToCreate: ColumnDescription<T>[],
  options?: ColumnOptions<T>
): Column<T>[] => {
  const columnDefinitions = new ColumnDefinitionSetBuilder<T>()
    .addColumns(columnsToCreate)
    .build();

  return columnDefinitions.map(column => {
    return createColumnWithDefaults(column, options);
  });
};

export const useColumns = <T extends DomainObject>(
  columnsToCreate: ColumnDescription<T>[],
  options?: ColumnOptions<T>,
  depsArray: DependencyList = []
): Column<T>[] => {
  return useMemo(() => createColumns(columnsToCreate, options), depsArray);
};
