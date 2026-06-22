import { useQuery } from '@openmsupply-client/common';
import { usePatientDocumentApi } from '../utils/useDocumentApi';

export const useDocumentHistory = (name: string) => {
  const api = usePatientDocumentApi();
  return useQuery({
    queryKey: api.keys.history(name || ''),
    queryFn: () => api.get.documentHistory(name || ''),
    enabled: !!name
  });
};
