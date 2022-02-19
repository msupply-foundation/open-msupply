import React from 'react';
import create from 'zustand';

import { AppRoute } from '@openmsupply-client/config';
import {
  Store,
  useHostContext,
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
  const { setStore: setHostStore, setUser } = useHostContext();
  const [mostRecentlyUsedCredentials, setMRUCredentials] =
    useLocalStorage('/mru/credentials');
  const [, setAuthToken] = useLocalStorage('/authentication/token');
  const [, setStoreId] = useLocalStorage('/authentication/storeid');
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
    setAuthToken(token);
    setMRUCredentials({ username: username, store: store });
    setUser({ id: '', name: username });
    setStoreId(store?.id ?? '');

    if (store) setHostStore(store);
    // navigate back, if redirected by the <RequireAuthentication /> component
    // or to the dashboard as a default
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
