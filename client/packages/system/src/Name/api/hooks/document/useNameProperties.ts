import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useNameProperties = () => {
  const api = useNameApi();
  return useQuery(api.keys.properties(), () => api.get.properties());
};
