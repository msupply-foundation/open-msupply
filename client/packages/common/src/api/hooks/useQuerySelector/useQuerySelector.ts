import { useQuery, UseQueryResult } from 'react-query';

export const useQuerySelector = <T, Keys extends keyof T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  select: (data: T) => Pick<T, Keys>
): UseQueryResult<Pick<T, Keys>, unknown> => {
  return useQuery(queryKey, queryFn, { select });
};
