import { useQuery } from '@openmsupply-client/common';
import { usePluginApi } from '../utils/usePluginApi';

export const usePluginData = (stockLineIds: string[]) => {
  const api = usePluginApi();

  return useQuery({
    queryKey: api.keys.data(stockLineIds),
    queryFn: async () => api.get.pluginData(stockLineIds),
    retry: false,
  });
};
