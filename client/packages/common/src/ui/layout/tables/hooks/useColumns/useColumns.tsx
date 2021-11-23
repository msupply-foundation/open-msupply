import { DependencyList, useMemo } from 'react';
import { DomainObject } from '../../../../../types';
import {
  ColumnDataAccessor,
  ColumnDefinition,
  ColumnFormat,
  ColumnAlign,
  Column,
} from '../../columns/types';
import { useFormatDate, useFormatNumber } from '../../../../../intl';
import { BasicCell, BasicHeader } from '../../components';
import { getDateOrNull } from '../../../../../utils';
import { SortBy } from '../../../../../hooks';
import { ColumnDefinitionSetBuilder, ColumnKey } from '../../utils';

const getColumnWidths = <T extends DomainObject>(
  column: ColumnDefinition<T>
) => {
  const getDefaultWidth = () => {
    switch (column.format) {
      case ColumnFormat.Integer:
        return 60;
      default: {
        return 100;
      }
    }
  };

  const defaultWidth = getDefaultWidth();

  const minWidth = column.minWidth || column.width || defaultWidth;
  const width = column.width || defaultWidth;

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

/*
 * The default accessor will try to use the key of the column to access the value of the column.
 * If the key is not a value of the domain object, then you should provide your own data accessor.
 */
const getDefaultAccessor =
  <T extends DomainObject>(
    column: ColumnDefinition<T>
  ): ColumnDataAccessor<T> =>
  (row: T) => {
    const key = column.key as keyof T;
    return row[key];
  };

const getDefaultFormatter = <T extends DomainObject>(
  column: ColumnDefinition<T>
) => {
  switch (column.format) {
    case ColumnFormat.Date: {
      return (date: unknown) => {
        const formatDate = useFormatDate();
        const maybeDate = getDateOrNull(date as string);
        return maybeDate ? formatDate(maybeDate) : '';
      };
    }
    case ColumnFormat.Currency: {
      return (value: unknown) => {
        if (Number.isNaN(Number(value))) return '';

        const formatNumber = useFormatNumber();

        // TODO: fetch currency symbol or use style: 'currency'
        return `$${formatNumber(Number(value))}`;
      };
    }
    default: {
      return (value: unknown) => String(value ?? '');
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
