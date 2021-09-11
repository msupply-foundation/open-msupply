import { Column, IdType } from 'react-table';
import { GenericColumnType, ColumnDefinition, ColumnFormat } from '../types';
import { getCheckboxSelectionColumn } from './../columns/CheckboxSelectionColumn';
import { useFormatDate, useTranslation } from '../../../../intl';

const columnLookup = (column: GenericColumnType) => {
  if (column === GenericColumnType.Selection) {
    return getCheckboxSelectionColumn();
  }
  return null;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export const useColumns = <T extends object>(
  columnsToMap: (ColumnDefinition<T> | GenericColumnType)[]
): Column<T>[] => {
  const t = useTranslation();
  const formatDate = useFormatDate();

  return columnsToMap.map(column => {
    if (typeof column === 'string') {
      return columnLookup(column);
    }

    const { key, label, sortable = true } = column;
    const Header = t(label);
    const accessor = getAccessor<T>(column, formatDate);
    const disableSortBy = !sortable;
    const sortType = getSortType<T>(column);
    const sortInverted = column.format === ColumnFormat.date;
    const sortDescFirst = column.format === ColumnFormat.date;

    return {
      align: column.align || 'left',
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
