import { ObjectWithStringKeys } from './../../types/utility';
import { usePagination, PaginationState } from '../usePagination';
import { useSortBy, SortState, SortRule } from '../useSortBy';
import { useFilterBy, FilterState, FilterBy } from '../useFilterBy';

export interface QueryParams<T extends ObjectWithStringKeys>
  extends SortState<T>,
    FilterState<T>,
    PaginationState {}

export interface QueryParamsState<T extends ObjectWithStringKeys>
  extends SortState<T>,
    FilterState<T>,
    PaginationState {
  pagination: PaginationState;
  sort: SortState<T>;
  filter: FilterState<T>;
  queryParams: QueryParams<T>;
}

export const useQueryParams = <T extends ObjectWithStringKeys>({
  initialSortBy,
  initialFilterBy,
}: {
  initialSortBy: SortRule<T>;
  initialFilterBy?: FilterBy<T>;
}): QueryParamsState<T> => {
  const filter = useFilterBy(initialFilterBy);
  const sort = useSortBy(initialSortBy);
  const pagination = usePagination();

  const queryParams: QueryParams<T> = {
    ...pagination,
    ...filter,
    ...sort,
    filter,
    sort,
    pagination,
  };

  return {
    ...pagination,
    ...sort,
    ...filter,
    sort,
    filter,
    pagination,
    queryParams,
  };
};
