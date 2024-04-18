import { useQuery } from '@openmsupply-client/common';
import { useLogApi } from '../utils/useLogApi';

export const useLogLevel = () => {
  const api = useLogApi();

  return useQuery(api.keys.logLevel(), () => api.get.logLevel());
};
