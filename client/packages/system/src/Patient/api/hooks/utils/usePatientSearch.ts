import { PatientSearchInput, useMutation } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatientSearch = (input: PatientSearchInput) => {
  const api = usePatientApi();
  return {
    ...useMutation(() => api.get.search(input)),
  };
};
