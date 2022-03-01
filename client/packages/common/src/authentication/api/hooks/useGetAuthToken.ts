import { useMutation } from 'react-query';
import { useAuthApi } from './useAuthApi';
import { AuthenticationResponse, AuthQueries } from '../api';

interface LoginCredentials {
  username: string;
  password: string;
}

export const useGetAuthToken = () => {
  const api = useAuthApi();
  const { mutate, ...rest } = useMutation<
    AuthenticationResponse,
    unknown,
    LoginCredentials,
    unknown
  >(AuthQueries.get.authToken(api));

  return { mutate, ...rest };
};
