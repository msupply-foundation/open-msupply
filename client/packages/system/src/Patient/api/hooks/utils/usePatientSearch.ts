import { PatientSearchInput, useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatientSearch = (
  params: PatientSearchInput,
  enabled?: boolean
) => {
  const api = usePatientApi();
  return {
    ...useQuery(api.keys.search(params), () => api.get.search(params), {
      enabled,
    }),
  };
};
