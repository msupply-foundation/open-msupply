import { DomainObject } from './../../types/index';
import { usePagination, PaginationState } from '../usePagination';
import { useSortBy, SortState, SortRule } from '../useSortBy';
import { useFilterBy, FilterState, FilterBy } from '../useFilterBy';
import { useLocalStorage } from '../../localStorage';

export interface QueryParams<T extends DomainObject>
  extends SortState<T>,
    FilterState,
    PaginationState {}

export interface QueryParamsState<T extends DomainObject>
  extends SortState<T>,
    FilterState,
    PaginationState {
  pagination: PaginationState;
  sort: SortState<T>;
  filter: FilterState;
  queryParams: QueryParams<T>;
  storeId: string;
}

export const useQueryParams = <T extends DomainObject>({
  initialSortBy,
  initialFilterBy,
}: {
  initialSortBy: SortRule<T>;
  initialFilterBy?: FilterBy;
}): QueryParamsState<T> => {
  const filter = useFilterBy(initialFilterBy);
  const sort = useSortBy(initialSortBy);
  const pagination = usePagination();
  const [storeId] = useLocalStorage('/authentication/storeid', '');

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
    storeId: storeId ?? '',
  };
};
