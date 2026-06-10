import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useNamePropertiesV2 = () => {
  const api = useNameApi();
  return useQuery({
    queryKey: api.keys.propertiesV2(),
    queryFn: () => api.get.propertiesV2(),
  });
};
