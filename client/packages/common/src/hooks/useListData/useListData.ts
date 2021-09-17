import { useQueryClient, useMutation, useQuery } from 'react-query';
import { useQueryParams } from './useQueryParams';
import { SortRule } from './useSortBy';

export interface ListApi<T> {
  onQuery: ({
    first,
    offset,
    sortBy,
  }: {
    first: number;
    offset: number;
    sortBy: SortRule<T>;
  }) => () => Promise<{ data: T[]; totalLength: number }>;
  onDelete: (toDelete: T[]) => Promise<void>;
  onUpdate: (toUpdate: T) => Promise<T>;
}

export const useListData = <T>(
  initialSortBy: keyof T,
  queryKey: string | readonly unknown[],
  api: ListApi<T>
): any => {
  const queryClient = useQueryClient();
  const { queryParams, first, offset, sortBy } = useQueryParams(initialSortBy);
  const fullQueryKey = [queryKey, 'list', queryParams];

  const { data, isLoading: isQueryLoading } = useQuery(
    fullQueryKey,
    api.onQuery({ first, offset, sortBy })
  );

  const invalidation = () => queryClient.invalidateQueries(queryKey);

  const { mutateAsync: onDelete, isLoading: isDeleteLoading } = useMutation(
    api.onDelete,
    { onSuccess: invalidation }
  );

  const { mutateAsync: onUpdate, isLoading: isUpdateLoading } = useMutation(
    api.onDelete,
    { onSuccess: invalidation }
  );

  return {
    ...data,
    ...queryParams,
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
