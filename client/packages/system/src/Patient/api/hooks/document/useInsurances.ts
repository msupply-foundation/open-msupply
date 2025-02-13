import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useInsurances = (nameId: string) => {
  const api = usePatientApi();
  return useQuery(api.keys.insurances(), () => api.insurances(nameId));
};
