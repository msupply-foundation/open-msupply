import { DomainObject } from '@common/types';
import { SortRule, SortBy } from './../useSortBy';
import { UseMutateAsyncFunction } from 'react-query';
import { useQueryClient, useMutation, useQuery } from 'react-query';
import { QueryParams, useQueryParams } from '../useQueryParams';
import { FilterBy } from '../useFilterBy';
import { ClientError } from 'graphql-request';
import { useNotification } from '@common/hooks';

export interface ListApi<T extends DomainObject> {
  onRead: ({
    first,
    offset,
    sortBy,
    filterBy,
  }: {
    first: number;
    offset: number;
    sortBy: SortBy<T>;
    filterBy: FilterBy | null;
  }) => () => Promise<{ nodes: T[]; totalCount: number }>;
  onDelete: (toDelete: T[]) => Promise<string[]>;
  onUpdate: (toUpdate: Partial<T> & { id: string }) => Promise<string>;
  onCreate: (toCreate: Partial<T>) => Promise<string>;
}

interface ListDataState<T extends DomainObject> extends QueryParams<T> {
  data?: T[];
  totalCount?: number;
  invalidate: () => void;
  fullQueryKey: readonly unknown[];
  queryParams: QueryParams<T>;
  onUpdate: UseMutateAsyncFunction<
    string,
    unknown,
    Partial<T> & { id: string },
    unknown
  >;
  onDelete: UseMutateAsyncFunction<string[], unknown, T[], unknown>;
  onCreate: UseMutateAsyncFunction<string, unknown, Partial<T>, unknown>;
  isCreateLoading: boolean;
  isQueryLoading: boolean;
  isUpdateLoading: boolean;
  isDeleteLoading: boolean;
  isLoading: boolean;
}

export const useListData = <T extends DomainObject>(
  initialListParameters: {
    initialFilterBy?: FilterBy;
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
