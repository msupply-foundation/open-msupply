import { useGql, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../operations.generated';

export const useInitialisationStatus = (
  refetchInterval: number | false = false
) => {
  const { client } = useGql();
  const sdk = getSdk(client);

  return useQuery(
    'initialisationStatus',
    async () => {
      const result = await sdk.initialisationStatus();
      return result?.initialisationStatus;
    },
    {
      cacheTime: 0,
      refetchInterval,
    }
  );
};
