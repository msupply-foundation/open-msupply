import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from './useHostApi';

export const useinitialisationStatus = (
  refetchInterval: number | false = false
) => {
  const api = useHostApi();
  return useQuery(
    api.keys.initialisationStatus(),
    api.get.initialisationStatus,
    {
      cacheTime: 0,
      refetchInterval,
    }
  );
};
