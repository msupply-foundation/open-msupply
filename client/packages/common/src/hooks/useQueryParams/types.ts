import { RecordWithId } from '@common/types';

export interface FilterByConditionByType {
  string: 'equalTo' | 'like' | 'notEqualTo' | 'equalAnyOrNull';
  date: 'beforeOrEqualTo' | 'afterOrEqualTo' | 'equalTo' | 'between';
}

export type FilterRule = {
  [P in
    | FilterByConditionByType['string']
    | FilterByConditionByType['date']]?: unknown;
};

export type FilterBy = Record<string, FilterRule | null>;
export type FilterByWithBoolean = Record<string, FilterRule | null | boolean>;
export type FilterByWithStringAndBool = Record<
  string,
  FilterRule | null | boolean | string
>;

export interface FilterController {
  filterBy: FilterByWithBoolean | null;

  onChangeDateFilterRule: (
    key: string,
    condition: FilterByConditionByType['date'],
    value: Date | Date[]
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
  /** Changes the sort options as specified */
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
}
