import { LocaleKey } from '@openmsupply-client/common/src/intl/intlHelpers';
import { ReactNode, RefObject } from 'react';
import { Column, SortingRule } from 'react-table';

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
  align?: 'left' | 'right' | 'center';
}

export enum GenericColumnType {
  Selection = 'selection',
}

export interface QueryProps<D> {
  first: number;
  offset: number;
  sortBy?: SortingRule<D>[];
}

export interface QueryResponse<T> {
  data: T[];
  totalLength: number;
}

export interface DataTableApi<T> {
  selectAllRows: () => void;
  deselectAllRows: () => void;
  toggleSelectAllRows: () => void;
  selectedRows: T[];
}

export interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data?: T[];
  initialSortBy?: SortingRule<T>[];
  isLoading?: boolean;
  onFetchData: (props: QueryProps<T>) => void;
  onRowClick?: (row: T) => void;
  totalLength?: number;
  tableApi: RefObject<DataTableApi<T>>;
  children?: ReactNode;
}
