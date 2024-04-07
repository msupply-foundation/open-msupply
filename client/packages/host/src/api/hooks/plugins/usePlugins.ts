import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const usePlugins = () => {
  const api = useHostApi();
  return useQuery(api.keys.plugins(), api.get.plugins);
};
