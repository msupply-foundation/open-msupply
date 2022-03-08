import { ReactNode, FC } from 'react';
import { RecordWithId } from '@common/types';
import { Pagination, SortRule } from '@common/hooks';
import { Column } from './columns/types';

export interface QueryProps<D> {
  first: number;
  offset: number;
  sortBy?: SortRule<D>[];
}

export interface QueryResponse<T> {
  data: T[];
  totalLength: number;
}

export interface TableProps<T extends RecordWithId> {
  isDisabled?: boolean;
  columns: Column<T>[];
  data?: T[];
  isLoading?: boolean;
  pagination?: Pagination & { total?: number };
  onChangePage?: (page: number) => void;
  onRowClick?: null | ((row: T) => void);
  children?: ReactNode;
  noDataMessage?: string;
  ExpandContent?: FC<{ rowData: T }>;
  dense?: boolean;
}
