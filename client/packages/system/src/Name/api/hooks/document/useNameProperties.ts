import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useNameProperties = () => {
  const api = useNameApi();
  return useQuery({
    queryKey: api.keys.properties(),
    queryFn: () => api.get.properties()
  });
};
