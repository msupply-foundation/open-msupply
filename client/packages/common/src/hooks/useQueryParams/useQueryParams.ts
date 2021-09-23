import { useEffect } from 'react';
import { ObjectWithStringKeys } from './../../types/utility';
import { useRowRenderCount } from '../useRowRenderCount';
import { usePagination, PaginationState } from '../usePagination';
import { useSortBy, SortState, SortRule } from '../useSortBy';
import { useRegisterActions } from 'kbar';

export interface QueryParams<T extends ObjectWithStringKeys>
  extends SortState<T>,
    PaginationState {}

export interface QueryParamsState<T extends ObjectWithStringKeys>
  extends SortState<T>,
    PaginationState {
  pagination: PaginationState;
  queryParams: QueryParams<T>;
  numberOfRows: number;
}

export const useQueryParams = <T extends ObjectWithStringKeys>(
  initialSortBy: SortRule<T>
): QueryParamsState<T> => {
  const numberOfRows = useRowRenderCount();
  const pagination = usePagination(numberOfRows);
  const { sortBy, onChangeSortBy } = useSortBy<T>(initialSortBy);

  useEffect(() => {
    if (numberOfRows > pagination.first) {
      pagination.onChangeFirst(numberOfRows);
    }
  }, [numberOfRows, pagination.first]);

  const queryParams = { ...pagination, pagination, sortBy, onChangeSortBy };

  useRegisterActions([
    {
      id: 'list-view:next-page',
      name: 'List: Go to the next page',
      shortcut: ['g'],
      keywords: 'list, pagination, next page',
      perform: pagination.nextPage,
    },
  ]);

  return {
    ...pagination,
    pagination,
    sortBy,
    onChangeSortBy,
    queryParams,
    numberOfRows,
  };
};
