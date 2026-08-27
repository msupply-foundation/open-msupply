import { useQuery } from '@openmsupply-client/common';
import { usePatientDocumentApi } from '../utils/useDocumentApi';

export const useDocumentByName = (name: string | undefined) => {
  const api = usePatientDocumentApi();

  return useQuery({
    queryKey: api.keys.byName(name ?? ''),
    queryFn: () => api.get.byDocName(name ?? ''),
    refetchOnMount: false,
    gcTime: 0,
    enabled: !!name
  });
};
