import { useQuery, UseQueryResult } from 'react-query';

export const useQuerySelector = <T, ReturnType>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  select: (data: T) => ReturnType
): UseQueryResult<ReturnType, unknown> => {
  return useQuery(queryKey, queryFn, { select, refetchOnMount: false });
};
