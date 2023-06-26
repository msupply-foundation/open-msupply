import { useMutation } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useLinkPatientToStore = () => {
  const api = usePatientApi();
  return useMutation((nameId: string) => api.linkPatientToStore(nameId));
};
