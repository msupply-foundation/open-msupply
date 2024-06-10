import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useDonors = () => {
  const api = useNameApi();

  return useQuery(api.keys.donors(), () => api.get.donors());
};
