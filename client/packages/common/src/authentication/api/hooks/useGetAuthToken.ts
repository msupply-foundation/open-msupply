import { useMutation } from 'react-query';
import { useAuthApi } from './useAuthApi';

export const useGetAuthToken = () => {
  const api = useAuthApi();
  const { mutate, ...rest } = useMutation(api.get.authToken);

  return { mutate, ...rest };
};
