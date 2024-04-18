import { useQuery } from '@openmsupply-client/common';
import { useLogApi } from '../utils/useLogApi';

export const useLogFileNames = () => {
  const api = useLogApi();

  return useQuery(api.keys.fileNames(), () => api.get.logFileNames(), {
    onError: () => {},
  });
};
