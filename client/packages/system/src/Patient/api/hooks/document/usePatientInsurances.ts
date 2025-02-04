import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatientInsurances = () => {
  const api = usePatientApi();
  return useQuery(api.keys.getPatientInsurances(), () =>
    api.getPatientInsurances()
  );
};
