import { useQuery } from '@openmsupply-client/common';
import { usePatientDocumentApi } from '../utils/useDocumentApi';

export const usePatientDocument = (patientId: string | undefined) => {
  const api = usePatientDocumentApi();

  return useQuery({
    queryKey: api.keys.byPatient(patientId ?? ''),
    queryFn: () => api.get.byPatient(patientId ?? ''),
    refetchOnMount: false,
    gcTime: 0,
    enabled: !!patientId
  });
};
