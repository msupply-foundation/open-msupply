import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatient = (nameId: string | undefined) => {
  const api = usePatientApi();
  return useQuery({
    queryKey: api.keys.detail(nameId || ''),
    queryFn: () => api.get.byId(nameId || ''),
    enabled: !!nameId
  });
};
