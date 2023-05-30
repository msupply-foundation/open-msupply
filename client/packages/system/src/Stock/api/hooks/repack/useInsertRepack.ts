import { useMutation, useQueryClient } from 'packages/common/src';
import { useRepackApi } from '../utils/useRepackApi';

export const useInsertRepack = () => {
  const queryClient = useQueryClient();
  const api = useRepackApi();

  return useMutation(api.insert, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
