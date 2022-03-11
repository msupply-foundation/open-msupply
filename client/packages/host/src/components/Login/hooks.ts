import React from 'react';
import create from 'zustand';

import { AppRoute } from '@openmsupply-client/config';
import {
  AuthenticationError,
  useAuthContext,
  useLocation,
  useNavigate,
} from '@openmsupply-client/common';

interface Store {
  id: string;
  code: string;
}
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
  const { mostRecentlyUsedCredentials, login, isLoggingIn } = useAuthContext();
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

  const onLogin = async () => {
    setError();
    const { error, token } = await login(username, password, store);
    setError(error);
    setPassword('');
    if (!token) return;

    // navigate back, if redirected by the <RequireAuthentication /> component
    // or to the dashboard as a default
    const state = location.state as State | undefined;
    const from = state?.from?.pathname || `/${AppRoute.Dashboard}`;
    navigate(from, { replace: true });
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
