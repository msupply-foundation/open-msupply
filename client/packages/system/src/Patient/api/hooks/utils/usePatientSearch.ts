import { PatientSearchInput, useMutation } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatientSearch = () => {
  const api = usePatientApi();
  return useMutation((params: PatientSearchInput) => api.get.search(params));
};
