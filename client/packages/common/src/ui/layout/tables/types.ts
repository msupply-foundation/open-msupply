import { ReactNode, RefObject } from 'react';
import { Column, Row, SortingRule } from 'react-table';

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
  selectedRows: T[];
}

export interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data?: T[];
  initialSortBy?: SortingRule<T>[];
  isLoading?: boolean;
  onFetchData: (props: QueryProps<T>) => void;
  onRowClick?: <T extends Record<string, unknown>>(row: Row<T>) => void;
  totalLength?: number;
  tableApi: RefObject<DataTableApi<T>>;
  children?: ReactNode;
}
