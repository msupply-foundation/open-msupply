import {
  useAuthApi,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';

export const useUpdateUser = (token: string) => {
  const api = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation(api.get.updateUser, {
    onSettled: () => queryClient.invalidateQueries(api.keys.me(token)),
  });
};
