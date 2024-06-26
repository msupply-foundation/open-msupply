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
  children?: ReactNode;
  columns: Column<T>[];
  data?: T[];
  dense?: boolean;
  ExpandContent?: FC<{ rowData: T }>;
  enableColumnSelection?: boolean;
  generateRowTooltip?: (row: T) => string;
  id: string;
  isDisabled?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  isRowAnimated?: boolean;
  noDataMessage?: string;
  noDataElement?: JSX.Element;
  overflowX?:
    | 'auto'
    | 'hidden'
    | 'visible'
    | 'scroll'
    | 'inherit'
    | 'initial'
    | 'unset';
  width?: string | number;
  pagination?: Pagination & { total?: number };
  onChangePage?: (page: number) => void;
  onRowClick?: null | ((row: T) => void);
  additionalRows?: JSX.Element[];
}
