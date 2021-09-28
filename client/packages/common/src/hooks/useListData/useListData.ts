import { ObjectWithStringKeys } from './../../types/utility';
import { SortBy } from './../useSortBy/useSortBy';
import { UseMutateFunction } from 'react-query';
import { useQueryClient, useMutation, useQuery } from 'react-query';
import { QueryParams, useQueryParams } from '../useQueryParams';
import { SortRule } from '../useSortBy';
import { ClientError } from 'graphql-request';
import { useNotification } from '../../hooks';

export interface ListApi<T extends ObjectWithStringKeys> {
  onQuery: ({
    first,
    offset,
    sortBy,
  }: {
    first: number;
    offset: number;
    sortBy: SortBy<T>;
  }) => () => Promise<{ data: T[]; totalLength: number }>;
  onDelete: (toDelete: T[]) => Promise<void>;
  onUpdate: (toUpdate: T) => Promise<T>;
}

interface ListDataState<T extends ObjectWithStringKeys> extends QueryParams<T> {
  data?: T[];
  totalLength?: number;
  fullQueryKey: readonly unknown[];
  queryParams: QueryParams<T>;
  onUpdate: UseMutateFunction<T, unknown, T, unknown>;
  onDelete: UseMutateFunction<void, unknown, T[], unknown>;
  isQueryLoading: boolean;
  isUpdateLoading: boolean;
  isDeleteLoading: boolean;
  isLoading: boolean;
  numberOfRows: number;
}

export const useListData = <T extends ObjectWithStringKeys>(
  initialSortBy: SortRule<T>,
  queryKey: string | readonly unknown[],
  api: ListApi<T>,
  onError?: (e: ClientError) => void
): ListDataState<T> => {
  const queryClient = useQueryClient();
  const { queryParams, first, offset, sortBy, numberOfRows } =
    useQueryParams(initialSortBy);
  const fullQueryKey = [queryKey, 'list', queryParams];
  const { error } = useNotification();
  const defaultErrorHandler = (e: ClientError) =>
    error(e.message?.substring(0, 150))();

  const { data, isLoading: isQueryLoading } = useQuery(
    fullQueryKey,
    api.onQuery({ first, offset, sortBy }),
    {
      onError: onError || defaultErrorHandler,
      useErrorBoundary: (error: ClientError): boolean =>
        error.response?.status >= 500,
    }
  );

  const invalidate = () => queryClient.invalidateQueries(queryKey);

  const { mutateAsync: onDelete, isLoading: isDeleteLoading } = useMutation(
    api.onDelete,
    { onSuccess: invalidate }
  );

  const { mutateAsync: onUpdate, isLoading: isUpdateLoading } = useMutation(
    api.onUpdate,
    { onSuccess: invalidate }
  );

  return {
    ...(data ?? {}),
    ...queryParams,
    numberOfRows,
    fullQueryKey,
    queryParams,
    onUpdate,
    onDelete,
    isUpdateLoading,
    isDeleteLoading,
    isQueryLoading,
    isLoading: isUpdateLoading || isDeleteLoading || isQueryLoading,
  };
};
