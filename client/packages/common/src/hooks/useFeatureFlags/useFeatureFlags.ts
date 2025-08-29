import { useGql, useQuery } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useFeatureFlags = () => {
  const { client } = useGql();
  const api = getSdk(client);

  const { data } = useQuery({
    queryFn: async () => {
      const result = await api.featureFlags();
      return result.featureFlags;
    },
    // Would only invalidate app restart
    cacheTime: Infinity,
    staleTime: Infinity,
  });

  return data ?? {};
};
