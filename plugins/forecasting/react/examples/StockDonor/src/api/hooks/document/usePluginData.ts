import { useQuery } from '@openmsupply-client/common';
import { usePluginApi } from '../utils/usePluginApi';

export const usePluginData = (stockLineId: string) => {
  const api = usePluginApi();

  return useQuery(
    api.keys.data(stockLineId),
    async () => api.get.pluginData(stockLineId),
    {
      retry: false,
      onError: () => {},
    }
  );
};
