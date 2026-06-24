import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

/** Save a patch of patient `properties_v2` values. On success invalidates the
 * patient detail query so the view re-fetches with the merged blob. */
export const useUpdatePatientPropertiesV2 = (patientId: string) => {
  const queryClient = useQueryClient();
  const api = usePatientApi();
  return useMutation({
    mutationFn: api.updatePropertiesV2,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: api.keys.detail(patientId) }),
  });
};
