import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useInsuranceProviders = () => {
  const api = usePatientApi();
  return useQuery(api.keys.insuranceProviders(), () =>
    api.insuranceProviders()
  );
};
