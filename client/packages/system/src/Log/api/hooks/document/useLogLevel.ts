import { useQuery } from 'react-query';
import { useLogApi } from '../utils/useLogApi';

export const useLogLevel = () => {
  const api = useLogApi();

  return useQuery(api.keys.logLevel(), () => api.get.logLevel());
};
