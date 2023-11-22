import { useQuery } from 'react-query';
import { useLogApi } from '../utils/useLogApi';

export const useLogLevel = () => {
  const api = useLogApi();

  const result = useQuery(api.keys.list(), () => api.get.logLevel({}));
  return { ...result };
};
