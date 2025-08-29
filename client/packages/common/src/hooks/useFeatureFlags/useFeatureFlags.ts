import { useGql, useQuery } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useFeatureFlags = () => {
  const { client } = useGql();
  const api = getSdk(client);

  const { data } = useQuery({
    queryFn: async () => {
      const { featureFlags } = await api.featureFlags();

      return {
        tableUsabilityImprovements:
          !!featureFlags['table_usability_improvements'],
      };
    },
    // Only invalidates on app restart
    cacheTime: Infinity,
    staleTime: Infinity,
  });

  return data;
};
