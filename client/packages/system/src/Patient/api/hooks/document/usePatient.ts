import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatient = (nameId: string) => {
  const api = usePatientApi();
  return useQuery(
    api.keys.detail(nameId || ''),
    () => api.get.byId(nameId || ''),
    {
      enabled: !!nameId,
    }
  );
};
