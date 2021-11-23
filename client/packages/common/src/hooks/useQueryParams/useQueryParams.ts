import { usePagination, PaginationState } from '../usePagination';
import { useSortBy, SortState, SortRule } from '../useSortBy';
import { useFilterBy, FilterState, FilterBy } from '../useFilterBy';

export interface QueryParams<T>
  extends SortState<T>,
    FilterState,
    PaginationState {}

export interface QueryParamsState<T>
  extends SortState<T>,
    FilterState,
    PaginationState {
  pagination: PaginationState;
  sort: SortState<T>;
  filter: FilterState;
  queryParams: QueryParams<T>;
}

export const useQueryParams = <T>({
  initialSortBy,
  initialFilterBy,
}: {
  initialSortBy: SortRule<T>;
  initialFilterBy?: FilterBy;
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
