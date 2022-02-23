import { useRef } from 'react';
import {
  useOmSupplyApi,
  AuthTokenQuery,
  useMutation,
  MutateOptions,
} from '@openmsupply-client/common';

const REFRESH_INTERVAL = 10 * 60 * 1000;

export type AuthenticationError = {
  message: string;
};
interface AuthenticationResponse {
  token: string;
  error?: AuthenticationError;
}

const tokenGuard = (authTokenQuery: AuthTokenQuery): AuthenticationResponse => {
  if (authTokenQuery.authToken.__typename === 'AuthToken') {
    return { token: authTokenQuery.authToken.token };
  }

  if (authTokenQuery.authToken.__typename === 'AuthTokenError') {
    switch (authTokenQuery.authToken.error.__typename) {
      case 'DatabaseError':
      case 'InternalError':
        return {
          token: '',
          error: { message: authTokenQuery.authToken.error.description },
        };
    }
  }

  return { token: '', error: { message: '' } };
};

interface LoginCredentials {
  username: string;
  password: string;
}

export const useAuthToken = () => {
  const { api } = useOmSupplyApi();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { mutate, ...rest } = useMutation<
    AuthenticationResponse,
    unknown,
    LoginCredentials,
    unknown
  >(async credentials => {
    const result = await api.authToken(credentials);
    return tokenGuard(result);
  });

  const login = (
    credentials: LoginCredentials,
    options: MutateOptions<
      AuthenticationResponse,
      unknown,
      LoginCredentials,
      unknown
    >
  ) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    mutate(credentials, options);
    timeoutRef.current = setTimeout(() => {
      login(credentials, options);
    }, REFRESH_INTERVAL);
  };
  return { login, ...rest };
};
