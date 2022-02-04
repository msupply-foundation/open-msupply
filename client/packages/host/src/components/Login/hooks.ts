import React from 'react';
import create from 'zustand';

import { AppRoute } from '@openmsupply-client/config';
import {
  Store,
  useHostContext,
  useLocalStorage,
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
  const { setStore: setHostStore, setUser } = useHostContext();
  const [previousAuth, setPreviousAuth] = useLocalStorage(
    '/authentication/previous'
  );
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

  React.useEffect(() => {
    if (previousAuth?.store && !store) {
      setStore(previousAuth.store);
    }
    if (previousAuth?.username && !username) {
      setUsername(previousAuth.username);
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }, [previousAuth]);

  React.useEffect(() => {
    setIsLoggingIn(isAuthenticating);
    if (authenticationResponse?.token) {
      setPassword('');
      setPreviousAuth({ username: username, store: store });
      setUser({ id: '', name: username });
      if (store) setHostStore(store);
      navigate(`/${AppRoute.Dashboard}`);
    }
  }, [authenticationResponse, isAuthenticating]);

  return { authenticationResponse, isValid, onLogin, ...state };
};
