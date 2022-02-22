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
import { useAuthToken } from './api';

interface LoginForm {
  isLoggingIn: boolean;
  password: string;
  store?: Store;
  username: string;
  setIsLoggingIn: (isLoggingIn: boolean) => void;
  setPassword: (password: string) => void;
  setStore: (store?: Store) => void;
  setUsername: (username: string) => void;
}

interface State {
  from?: Location;
}

export const useLoginFormState = create<LoginForm>(set => ({
  isLoggingIn: false,
  password: '',
  store: undefined,
  username: '',
  setIsLoggingIn: (isLoggingIn: boolean) =>
    set(state => ({ ...state, isLoggingIn })),
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
  const [mostRecentlyUsedCredentials] = useLocalStorage('/mru/credentials');
  const { login } = useAuthContext();
  const {
    isLoggingIn,
    password,
    setIsLoggingIn,
    setPassword,
    setStore,
    setUsername,
    store,
    username,
  } = state;
  const { data: authenticationResponse, isLoading: isAuthenticating } =
    useAuthToken({ username, password }, isLoggingIn);

  const onLogin = () => {
    setIsLoggingIn(true);
  };

  const isValid = !!username && !!password && !!store?.id;
  const onAuthenticated = (token: string) => {
    setPassword('');
    // navigate back, if redirected by the <RequireAuthentication /> component
    // or to the dashboard as a default
    login({ id: '', name: username }, token, store);
    const state = location.state as State | undefined;
    const from = state?.from?.pathname || `/${AppRoute.Dashboard}`;
    navigate(from, { replace: true });
  };

  React.useEffect(() => {
    if (mostRecentlyUsedCredentials?.store && !store) {
      setStore(mostRecentlyUsedCredentials.store);
    }
    if (mostRecentlyUsedCredentials?.username && !username) {
      setUsername(mostRecentlyUsedCredentials.username);
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }, [mostRecentlyUsedCredentials]);

  React.useEffect(() => {
    setIsLoggingIn(isAuthenticating);

    if (authenticationResponse?.token) {
      onAuthenticated(authenticationResponse.token);
    }
  }, [authenticationResponse, isAuthenticating]);

  return { authenticationResponse, isValid, onLogin, ...state };
};
