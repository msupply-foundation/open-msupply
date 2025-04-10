import React, { useEffect } from 'react';
import { create } from 'zustand';
import { AppRoute } from '@openmsupply-client/config';
import {
  AuthenticationError,
  InitialisationStatusType,
  useAuthContext,
  useInitialisationStatus,
  useLocation,
  useNavigate,
  useIsGapsStoreOnly,
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
  passwordRef: React.RefObject<HTMLInputElement>
) => {
  const state = useLoginFormState();
  const { data: initStatus } = useInitialisationStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const isGapsStore = useIsGapsStoreOnly();
  const { mostRecentUsername, login, isLoggingIn } = useAuthContext();
  const { password, setPassword, setUsername, username, error, setError } =
    state;

  const onLogin = async () => {
    setError();
    const { error, token } = await login(username.trim(), password);
    setError(error);
    setPassword('');
    if (!token) return;

    // navigate back, if redirected by the <RequireAuthentication /> component
    // or to the dashboard as a default
    const state = location.state as State | undefined;
    let from = state?.from?.pathname || `/${AppRoute.Dashboard}`;

    // if GAPS store only, always redirect to Cold Chain
    if (isGapsStore) {
      from = `/${AppRoute.Coldchain}/${AppRoute.Equipment}`;
    }
    navigate(from, { replace: true });
  };

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
  };
};
