import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

/** Save a patch of patient `properties_v2` values. On success invalidates the
 * patient detail query so the view re-fetches with the merged blob. */
export const useUpdatePatientCustomFields = (patientId: string) => {
  const queryClient = useQueryClient();
  const api = usePatientApi();
  return useMutation({
    mutationFn: api.updateCustomFields,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: api.keys.detail(patientId) }),
  });
};
