import React, { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { AppRoute } from '@openmsupply-client/config';
import {
  AuthenticationError,
  InitialisationStatusType,
  LocalStorage,
  useAuthApi,
  useAuthContext,
  useInitialisationStatus,
  useLocation,
  useNavigate,
  useQueryClient,
} from '@openmsupply-client/common';

interface LoginForm {
  error?: AuthenticationError;
  password: string;
  username: string;
  setError: (error?: AuthenticationError) => void;
  setPassword: (password: string) => void;
  setUsername: (username: string) => void;
}

interface State {
  from?: Location;
}

export const useLoginFormState = create<LoginForm>(set => ({
  error: undefined,
  password: '',
  username: '',

  setError: (error?: AuthenticationError) =>
    set(state => ({ ...state, error })),
  setPassword: (password: string) => set(state => ({ ...state, password })),
  setUsername: (username: string) => set(state => ({ ...state, username })),
}));

export const useLoginForm = (
  passwordRef: React.RefObject<HTMLInputElement | null>,
  navigateOnSuccess = true
) => {
  const state = useLoginFormState();
  const { data: initStatus } = useInitialisationStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const { mostRecentUsername, login, isLoggingIn } = useAuthContext();
  const queryClient = useQueryClient();
  const authApi = useAuthApi();
  const { password, setPassword, setUsername, username, error, setError } =
    state;
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [loginRedirectFrom, setLoginRedirectFrom] = useState('/');

  const onLogin = async () => {
    setError();
    const { error, token } = await login(username.trim(), password);
    setError(error);
    setPassword('');
    if (!token) return;

    if (!navigateOnSuccess) return;

    const locationState = location.state as State | undefined;
    const redirectTo = locationState?.from?.pathname || `/`;
    setLoginRedirectFrom(redirectTo);

    const userDetails = queryClient.getQueryData<{
      stores?: { nodes?: { id: string; isDisabled?: boolean }[] };
    }>(authApi.keys.me(token));
    const enabledStoreCount =
      userDetails?.stores?.nodes?.filter(s => !s.isDisabled).length ?? 0;
    const skipPrefs = LocalStorage.getItem('/login/skip-store-selector') ?? {};
    const optedOut = !!skipPrefs[username.trim().toLowerCase()];

    if (enabledStoreCount > 1 && !optedOut) {
      setShowStoreSelector(true);
    } else {
      navigate(redirectTo, { replace: true });
    }
  };

  const dismissStoreSelector = useCallback(() => {
    setShowStoreSelector(false);
    navigate(loginRedirectFrom, { replace: true });
  }, [navigate, loginRedirectFrom]);

  const isValid = !!username && !!password;

  React.useEffect(() => {
    if (mostRecentUsername && !username) {
      setUsername(mostRecentUsername);
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }, [mostRecentUsername]);

  useEffect(() => {
    if (!initStatus) return;

    if (initStatus.status != InitialisationStatusType.Initialised)
      navigate(`/${AppRoute.Initialise}`);
  }, [initStatus]);

  return {
    isValid,
    onLogin,
    isLoggingIn,
    ...state,
    error,
    siteName: initStatus?.siteName,
    showStoreSelector,
    dismissStoreSelector,
  };
};
