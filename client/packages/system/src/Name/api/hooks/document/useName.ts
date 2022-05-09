import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useName = (nameId: string) => {
  const api = useNameApi();
  return useQuery(
    api.keys.detail(nameId || ''),
    () => api.get.byId(nameId || ''),
    {
      enabled: !!nameId,
    }
  );
};
