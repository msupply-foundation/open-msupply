import { ObjectWithStringKeys } from './../../types/utility';
import { usePagination, PaginationState } from '../usePagination';
import { useSortBy, SortState, SortRule } from '../useSortBy';

export interface QueryParams<T extends ObjectWithStringKeys>
  extends SortState<T>,
    PaginationState {}

export interface QueryParamsState<T extends ObjectWithStringKeys>
  extends SortState<T>,
    PaginationState {
  pagination: PaginationState;
  queryParams: QueryParams<T>;
}

export const useQueryParams = <T extends ObjectWithStringKeys>(
  initialSortBy: SortRule<T>
): QueryParamsState<T> => {
  const pagination = usePagination();
  const { sortBy, onChangeSortBy } = useSortBy<T>(initialSortBy);

  const queryParams = { ...pagination, pagination, sortBy, onChangeSortBy };

  return {
    ...pagination,
    pagination,
    sortBy,
    onChangeSortBy,
    queryParams,
  };
};
