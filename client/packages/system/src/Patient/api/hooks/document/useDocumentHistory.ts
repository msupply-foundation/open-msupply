import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useDocumentHistory = (name: string) => {
  const api = usePatientApi();
  return useQuery(
    api.keys.history(name || ''),
    () => api.get.documentHistory(name || ''),
    {
      enabled: !!name,
    }
  );
};
