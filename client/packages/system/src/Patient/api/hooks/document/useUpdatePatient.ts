import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  const api = usePatientApi();
  return useMutation({
    mutationFn: api.updatePatient,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    })
  });
};
