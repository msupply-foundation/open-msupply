import { useMutation } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

export const useGetAuthToken = () => {
  const api = useAuthApi();
  const { mutate, ...rest } = useMutation({ mutationFn: api.get.authToken });

  return { mutate, ...rest };
};
