import { DependencyList, useMemo } from 'react';
import { RecordWithId } from '@common/types';
import {
  ColumnDataAccessor,
  ColumnDefinition,
  ColumnFormat,
  ColumnAlign,
  Column,
} from '../../columns/types';
import { useFormatDateTime, DateUtils } from '@common/intl';
import { BasicCell, BasicHeader } from '../../components';
import { SortBy } from '@common/hooks';
import { ColumnDefinitionSetBuilder, ColumnKey } from '../../utils';

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
  <T extends RecordWithId>(
    column: ColumnDefinition<T>
  ): ColumnDataAccessor<T> =>
  ({ rowData }) => {
    const key = column.key as keyof T;
    const value = rowData[key];
    return typeof value === 'function' ? value() : value;
  };

const getDefaultColumnSetter =
  <T extends RecordWithId>(column: ColumnDefinition<T>) =>
  () => {
    if (process.env['NODE_ENV']) {
      throw new Error(
        `The cell from the column with key [${String(
          column.key
        )}] called the default setter.
         Did you forget to set a custom setter?
         When defining your columns, add a setter for this column, i.e.
         const columns = useColumns(['${String(
           column.key
         )}', { Cell: TextInputCell, setter }])
         `
      );
    }
  };

const getDefaultFormatter = <T extends RecordWithId>(
  column: ColumnDefinition<T>
) => {
  switch (column.format) {
    case ColumnFormat.Date: {
      return (date: unknown) => {
        if (date === '[multiple]') return '[multiple]';

        const { localisedDate } = useFormatDateTime();
        const maybeDate = DateUtils.getDateOrNull(date as string | null);
        return maybeDate ? localisedDate(maybeDate) : '';
      };
    }
    case ColumnFormat.Currency: {
      return (value: unknown) => {
        if (Number.isNaN(Number(value))) return '';

        return `${Number(value)}`;
      };
    }
    default: {
      return (value: unknown) => String(value ?? '');
    }
  }
};

const getDefaultColumnAlign = <T extends RecordWithId>(
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

interface ColumnOptions<T extends RecordWithId> {
  /** Changes the sort options as specified */
  onChangeSortBy?: (sort: string, dir: 'desc' | 'asc') => void;
  sortBy?: SortBy<T>;
}

export type ColumnDescription<T extends RecordWithId> =
  | ColumnDefinition<T>
  | ColumnKey
  | [ColumnKey | ColumnDefinition<T>, Omit<ColumnDefinition<T>, 'key'>]
  | [ColumnKey];

export const createColumnWithDefaults = <T extends RecordWithId>(
  column: ColumnDefinition<T>,
  options?: ColumnOptions<T>
): Column<T> => {
  const defaults: Omit<Column<T>, 'key'> = {
    label: '',
    labelProps: {},
    description: '',
    format: ColumnFormat.Text,

    Cell: BasicCell,
    Header: BasicHeader,

    sortable: !!options?.onChangeSortBy,
    sortInverted: column.format === ColumnFormat.Date,
    sortDescFirst: column.format === ColumnFormat.Date,

    onChangeSortBy: options?.onChangeSortBy,
    sortBy: options?.sortBy,

    accessor: getDefaultAccessor<T>(column),
    sortType: getSortType(column),
    align: getDefaultColumnAlign(column),
    formatter: getDefaultFormatter<T>(column),
    setter: getDefaultColumnSetter<T>(column),
  };

  return { ...defaults, ...column };
};

export const createColumns = <T extends RecordWithId>(
  columnsToCreate: ColumnDescription<T>[],
  options?: ColumnOptions<T>
): Column<T>[] => {
  const columnDefinitions = new ColumnDefinitionSetBuilder<T>()
    .addColumns(columnsToCreate)
    .build();

  return columnDefinitions.map(column =>
    createColumnWithDefaults(column, options)
  );
};

export const useColumns = <T extends RecordWithId>(
  columnsToCreate: ColumnDescription<T>[],
  options?: ColumnOptions<T>,
  depsArray: DependencyList = []
): Column<T>[] =>
  useMemo(() => createColumns(columnsToCreate, options), depsArray);
