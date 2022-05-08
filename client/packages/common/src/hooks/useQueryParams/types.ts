import { RecordWithId } from '@common/types';
import { Column } from '../../ui/layout/tables';

export interface FilterByConditionByType {
  string: 'equalTo' | 'like';
  date: 'beforeOrEqualTo' | 'afterOrEqualTo' | 'equalTo';
}

type FilterRule = {
  [P in
    | FilterByConditionByType['string']
    | FilterByConditionByType['date']]?: unknown;
};

export type FilterBy = Record<string, FilterRule | null>;

export interface FilterController {
  filterBy: FilterBy | null;

  onChangeDateFilterRule: (
    key: string,
    condition: FilterByConditionByType['date'],
    value: Date
  ) => void;

  onChangeStringFilterRule: (
    key: string,
    condition: FilterByConditionByType['string'],
    value: string
  ) => void;

  onClearFilterRule: (key: string) => void;
}

export interface Pagination {
  page: number;
  offset: number;
  first: number;
}

export interface PaginationController extends Pagination {
  onChangePage: (newPage: number) => void;
  onChangeFirst: (newFirst: number) => void;
  nextPage: () => void;
}
export interface SortRule<T> {
  key: keyof T | string;
  isDesc?: boolean;
}

export interface SortBy<T> extends SortRule<T> {
  direction: 'asc' | 'desc';
  getSortValue?: (row: T) => string | number;
}
export interface SortController<T extends RecordWithId> {
  sortBy: SortBy<T>;
  onChangeSortBy: (newSortRule: Column<T>) => SortBy<T>;
}
