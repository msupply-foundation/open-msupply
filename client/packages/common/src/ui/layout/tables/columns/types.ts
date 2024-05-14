import { JSXElementConstructor } from 'react';
import { SortBy } from '@common/hooks';
import { useTranslation, LocaleKey, TypedTFunction } from '@common/intl';
import { RecordWithId } from '@common/types';

export interface CellProps<T extends RecordWithId> {
  rowData: T;
  columns: Column<T>[];
  column: Column<T>;
  rowKey: string;
  columnIndex: number;
  rowIndex: number;
  isDisabled?: boolean;
  isRequired?: boolean;
  isError?: boolean;
  isAutoFocus?: boolean;
  // Unique name for browser autocomplete (to remember previously entered values for that name)
  autocompleteName?: string;
  localisedText: TypedTFunction<LocaleKey>;
  localisedDate: (date: string | number | Date) => string;
}

export interface HeaderProps<T extends RecordWithId> {
  column: Column<T>;
}

export enum ColumnFormat {
  Currency,
  Date,
  Integer,
  Real,
  Text,
}

export enum ColumnAlign {
  Left = 'left',
  Right = 'right',
  Center = 'center',
}

export type ColumnDataAccessor<T extends RecordWithId, R = unknown> = (params: {
  rowData: T;
}) => R;

export type Translators = {
  t: ReturnType<typeof useTranslation>;
  d: (date: string | number | Date) => string;
};

export type ColumnDataFormatter = (
  rowDataValue: unknown,
  t: Translators
) => string;

export type ColumnDataSetter<T> = (
  rowData: Partial<T> & { id: string }
) => void;

export enum GenericColumnKey {
  Selection = 'selection',
}

export interface Column<T extends RecordWithId> {
  key: keyof T | GenericColumnKey | string;
  accessor: ColumnDataAccessor<T>;

  label: LocaleKey | '' | number;
  labelProps: Record<string, unknown>;
  description: LocaleKey | '';

  format: ColumnFormat;
  align: ColumnAlign;

  sortable: boolean;
  sortDescFirst: boolean;
  sortType: 'datetime' | 'numeric' | 'alphanumeric';
  sortInverted: boolean;
  getSortValue?: (row: T) => string | number;

  getIsError?: (row: T) => boolean;
  getIsDisabled?: (row: T) => boolean;

  onChangeSortBy?: (sort: string, dir: 'desc' | 'asc') => void;
  sortBy?: SortBy<T>;

  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  maxLength?: number;
  backgroundColor?: string;

  Cell: JSXElementConstructor<CellProps<T>>;
  Header: JSXElementConstructor<HeaderProps<T>>;

  formatter: ColumnDataFormatter;

  order?: number;

  setter: ColumnDataSetter<T>;
  // When using browser autocomplete in tables, row data needs to be used to set autocompleteName
  // to a value that's related to row data (like item id)
  autocompleteProvider?: (rowDataValue: T) => string;
}

export interface ColumnDefinition<T extends RecordWithId>
  extends Partial<Omit<Column<T>, 'key'>> {
  key: keyof T | GenericColumnKey | string;
}
