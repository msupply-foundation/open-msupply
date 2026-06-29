import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useNameCustomFields = () => {
  const api = useNameApi();
  return useQuery({
    queryKey: api.keys.customFields(),
    queryFn: () => api.get.customFields(),
  });
};
