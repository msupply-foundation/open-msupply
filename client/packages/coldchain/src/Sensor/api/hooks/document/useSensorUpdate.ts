import { useQueryClient, useMutation } from 'packages/common/src';
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
