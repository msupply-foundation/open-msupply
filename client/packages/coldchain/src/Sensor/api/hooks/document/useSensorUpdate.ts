import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useSensorApi } from '../utils/useSensorApi';

export const useSensorUpdate = () => {
  const queryClient = useQueryClient();
  const api = useSensorApi();
  return useMutation(api.update, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
