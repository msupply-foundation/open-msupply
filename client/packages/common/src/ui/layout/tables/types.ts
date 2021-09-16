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
  width?: number;
  maxWidth?: number;
  minWidth?: number;
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

interface Pagination {
  first: number;
  offset: number;
  total: number;
}

export interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data?: T[];
  sortBy: SortingRule<T>[];
  isLoading?: boolean;
  onSortBy: (sortRule: SortingRule<T>[]) => void;
  pagination: Pagination;
  onChangePage: (page: number) => void;
  onRowClick?: (row: T) => void;
  tableApi: RefObject<DataTableApi<T>>;
  children?: ReactNode;
}
