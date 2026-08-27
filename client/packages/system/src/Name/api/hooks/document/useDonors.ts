import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useDonors = () => {
  const api = useNameApi();

  return useQuery({
    queryKey: api.keys.donors(),
    queryFn: () => api.get.donors({ first: 1000 }),
  });
};
