import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useInsertPatient = () => {
  const queryClient = useQueryClient();
  const api = usePatientApi();
  return useMutation({
    mutationFn: api.insertPatient,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    })
  });
};
