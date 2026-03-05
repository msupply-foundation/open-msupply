import { useGql, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../operations.generated';

export const useInitialisationStatus = (
  refetchInterval: number | false = false,
  shouldSuspend?: boolean
) => {
  const { client } = useGql();
  const sdk = getSdk(client);

  return useQuery({
    queryKey: ['initialisationStatus'],

    queryFn: async () => {
      const result = await sdk.initialisationStatus();
      return result?.initialisationStatus;
    },

    gcTime: 0,
    refetchInterval
  });
};
