import {
  useAuthApi,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';

export const useUpdateUser = () => {
  const api = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.get.updateUser,
    onSettled: () => queryClient.invalidateQueries({ queryKey: api.keys.userSync() }),
  });
};
