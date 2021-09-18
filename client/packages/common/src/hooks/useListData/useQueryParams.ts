import { useEffect } from 'react';
import { useRowRenderCount } from './useRowRenderCount';
import { usePagination, PaginationState } from './usePagination';
import { useSortBy, SortState } from './useSortBy';

interface QueryParams<T> extends SortState<T>, PaginationState {}

interface QueryParamsState<T> extends SortState<T>, PaginationState {
  pagination: PaginationState;
  queryParams: QueryParams<T>;
  numberOfRows: number;
}

export const useQueryParams = <T>(
  initialSortBy: keyof T
): QueryParamsState<T> => {
  const numberOfRows = useRowRenderCount();
  const pagination = usePagination(numberOfRows);
  const { sortBy, onChangeSortBy } = useSortBy(initialSortBy);

  useEffect(() => {
    if (numberOfRows > pagination.first) {
      pagination.onChangeFirst(numberOfRows);
    }
  }, [numberOfRows, pagination.first]);

  const queryParams = { ...pagination, pagination, sortBy, onChangeSortBy };

  return {
    ...pagination,
    pagination,
    sortBy,
    onChangeSortBy,
    queryParams,
    numberOfRows,
  };
};
