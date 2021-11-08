import { ObjectWithStringKeys } from './../../types/utility';
import { SortRule, SortBy } from './../useSortBy/useSortBy';
import { UseMutateAsyncFunction } from 'react-query';
import { useQueryClient, useMutation, useQuery } from 'react-query';
import { QueryParams, useQueryParams } from '../useQueryParams';
import { FilterBy } from '../useFilterBy';
import { ClientError } from 'graphql-request';
import { useNotification } from '../../hooks';

export interface ListApi<T extends ObjectWithStringKeys> {
  onRead: ({
    first,
    offset,
    sortBy,
    filterBy,
  }: {
    first: number;
    offset: number;
    sortBy: SortBy<T>;
    filterBy: FilterBy<T> | null;
  }) => () => Promise<{ nodes: T[]; totalCount: number }>;
  onDelete: (toDelete: T[]) => Promise<void>;
  onUpdate: (toUpdate: T) => Promise<T>;
  onCreate: (toCreate: Partial<T>) => Promise<T>;
}

interface ListDataState<T extends ObjectWithStringKeys> extends QueryParams<T> {
  data?: T[];
  totalCount?: number;
  invalidate: () => void;
  fullQueryKey: readonly unknown[];
  queryParams: QueryParams<T>;
  onUpdate: UseMutateAsyncFunction<T, unknown, T, unknown>;
  onDelete: UseMutateAsyncFunction<void, unknown, T[], unknown>;
  onCreate: UseMutateAsyncFunction<T, unknown, Partial<T>, unknown>;
  isCreateLoading: boolean;
  isQueryLoading: boolean;
  isUpdateLoading: boolean;
  isDeleteLoading: boolean;
  isLoading: boolean;
}

export const useListData = <T extends ObjectWithStringKeys>(
  initialListParameters: {
    initialFilterBy?: FilterBy<T>;
    initialSortBy: SortRule<T>;
  },
  queryKey: string | readonly unknown[],
  api: ListApi<T>,
  onError?: (e: ClientError) => void
): ListDataState<T> => {
  const queryClient = useQueryClient();
  const { filterBy, queryParams, first, offset, sortBy } = useQueryParams(
    initialListParameters
  );
  const fullQueryKey = [queryKey, 'list', queryParams];
  const { error } = useNotification();
  const defaultErrorHandler = (e: ClientError) =>
    error(e.message?.substring(0, 150))();

  const { data, isLoading: isQueryLoading } = useQuery(
    fullQueryKey,
    api.onRead({
      first,
      offset,
      sortBy,
      filterBy,
    }),
    {
      onError: onError || defaultErrorHandler,
      useErrorBoundary: (error: ClientError): boolean =>
        error.response?.status >= 500,
    }
  );

  const invalidate = () => queryClient.invalidateQueries(queryKey);

  // TODO: Handler errors for mutations.
  const { mutateAsync: onDelete, isLoading: isDeleteLoading } = useMutation(
    api.onDelete,
    { onSuccess: invalidate }
  );

  const { mutateAsync: onUpdate, isLoading: isUpdateLoading } = useMutation(
    api.onUpdate,
    { onSuccess: invalidate }
  );

  const { mutateAsync: onCreate, isLoading: isCreateLoading } = useMutation(
    api.onCreate,
    { onSuccess: invalidate }
  );

  console.log('-------------------------------------------');
  console.log('queryParams', queryParams);
  console.log('-------------------------------------------');

  return {
    ...queryParams,
    totalCount: data?.totalCount,
    data: data?.nodes.slice(0, 20),
    onCreate,
    invalidate,
    isCreateLoading,
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
