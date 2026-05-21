import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useName = (nameId: string) => {
  const api = useNameApi();
  return useQuery({
    queryKey: api.keys.detail(nameId || ''),
    queryFn: () => api.get.byId(nameId || ''),
    enabled: !!nameId
  });
};
