import React from 'react';
import create from 'zustand';

import { AppRoute } from '@openmsupply-client/config';
import {
  Store,
  useAuthContext,
  useLocalStorage,
  useLocation,
  useNavigate,
} from '@openmsupply-client/common';
import { AuthenticationError, useAuthToken } from './api';

interface LoginForm {
  error?: AuthenticationError;
  password: string;
  store?: Store;
  username: string;
  setError: (error?: AuthenticationError) => void;
  setPassword: (password: string) => void;
  setStore: (store?: Store) => void;
  setUsername: (username: string) => void;
}

interface State {
  from?: Location;
}

export const useLoginFormState = create<LoginForm>(set => ({
  error: undefined,
  password: '',
  store: undefined,
  username: '',

  setError: (error?: AuthenticationError) =>
    set(state => ({ ...state, error })),
  setPassword: (password: string) => set(state => ({ ...state, password })),
  setStore: (store?: Store) => set(state => ({ ...state, store })),
  setUsername: (username: string) => set(state => ({ ...state, username })),
}));

export const useLoginForm = (
  passwordRef: React.RefObject<HTMLInputElement>
) => {
  const state = useLoginFormState();
  const navigate = useNavigate();
  const location = useLocation();
  const { onLoggedIn } = useAuthContext();
  const [mostRecentlyUsedCredentials] = useLocalStorage('/mru/credentials');
  const { login, isLoading: isLoggingIn } = useAuthToken();
  const {
    password,
    setPassword,
    setStore,
    setUsername,
    store,
    username,
    error,
    setError,
  } = state;

  const onLogin = () => {
    login(
      { username, password },
      {
        onSuccess: ({ error, token }) => {
          setError(error);
          setPassword('');

          if (!token) return;

          onLoggedIn({ id: '', name: username }, token, store);

          // navigate back, if redirected by the <RequireAuthentication /> component
          // or to the dashboard as a default
          const state = location.state as State | undefined;
          const from = state?.from?.pathname || `/${AppRoute.Dashboard}`;
          navigate(from, { replace: true });
        },
      }
    );
  };

  const isValid = !!username && !!password && !!store?.id;

  React.useEffect(() => {
    if (mostRecentlyUsedCredentials?.store && !store) {
      setStore(mostRecentlyUsedCredentials.store);
    }
    if (mostRecentlyUsedCredentials?.username && !username) {
      setUsername(mostRecentlyUsedCredentials.username);
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }, [mostRecentlyUsedCredentials]);

  return { isValid, onLogin, isLoggingIn, ...state, error };
};
