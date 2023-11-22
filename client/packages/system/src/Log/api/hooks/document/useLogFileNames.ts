import { useQuery } from 'react-query';
import { useLogApi } from '../utils/useLogApi';

export const useLogFileNames = () => {
  const api = useLogApi();

  const result = useQuery(api.keys.list(), () => api.get.logFileNames());
  return { ...result };
};
