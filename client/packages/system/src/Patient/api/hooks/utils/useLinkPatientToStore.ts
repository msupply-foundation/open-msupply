import { useMutation } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useLinkPatientToStore = () => {
  const api = usePatientApi();
  return {
    ...useMutation((params: { storeId: string; nameId: string }) =>
      api.linkPatientToStore(params.storeId, params.nameId)
    ),
  };
};
