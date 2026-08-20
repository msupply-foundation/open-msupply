import React, { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { AppRoute } from '@openmsupply-client/config';
import {
  AuthenticationError,
  InitialisationStatusType,
  LocalStorage,
  useAuthApi,
  useInitialisationStatus,
  useLocation,
  useLogin,
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
  const { login, completeSsoLogin, isLoggingIn, mostRecentCredentials } =
    useLogin();
  const mostRecentUsername = mostRecentCredentials[0]?.username ?? undefined;
  const queryClient = useQueryClient();
  const authApi = useAuthApi();
  const { password, setPassword, setUsername, username, error, setError } =
    state;
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [loginRedirectFrom, setLoginRedirectFrom] = useState('/');

  /**
   * Where to go once a session exists, and whether to ask which store first. Shared by the
   * password login and the single sign-on return — from here on the two are identical.
   */
  const goToApp = (sessionUsername: string) => {
    const locationState = location.state as State | undefined;
    const redirectTo = locationState?.from?.pathname || `/`;
    setLoginRedirectFrom(redirectTo);

    const userDetails = queryClient.getQueryData<{
      stores?: { nodes?: { id: string; isDisabled?: boolean }[] };
    }>(authApi.keys.me());
    const enabledStoreCount =
      userDetails?.stores?.nodes?.filter(s => !s.isDisabled).length ?? 0;
    const skipPrefs = LocalStorage.getItem('/login/skip-store-selector') ?? {};
    const optedOut = !!skipPrefs[sessionUsername.toLowerCase()];

    if (enabledStoreCount > 1 && !optedOut) {
      setShowStoreSelector(true);
    } else {
      navigate(redirectTo, { replace: true });
    }
  };

  const onLogin = async () => {
    setError();
    const { error, token } = await login(username.trim(), password);
    setError(error);
    setPassword('');
    if (!token) return;

    if (!navigateOnSuccess) return;

    goToApp(username.trim());
  };

  /**
   * Adopt the session the server created during single sign-on and carry on into the app. Called
   * when the server lands the browser back here with `sso=success`; the session cookie is already
   * set, so this only loads the client-side state.
   */
  const onSsoReturn = async () => {
    setError();
    const {
      success,
      username: sessionUsername,
      error,
    } = await completeSsoLogin();
    if (!success) {
      // The cookie should be there — a failure here means the session went away between the
      // callback and this request, so fall back to the form.
      setError(error ?? { message: 'Unauthenticated' });
      return;
    }
    setUsername(sessionUsername);
    if (!navigateOnSuccess) return;
    goToApp(sessionUsername);
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

    // `replace` so the uninitialised login page never becomes a back-button target — pushing
    // let a redirect loop bury the real history under thousands of entries.
    if (initStatus.status != InitialisationStatusType.Initialised)
      navigate(`/${AppRoute.Initialise}`, { replace: true });
  }, [initStatus]);

  return {
    isValid,
    onLogin,
    onSsoReturn,
    isLoggingIn,
    ...state,
    error,
    siteName: initStatus?.siteName,
    showStoreSelector,
    dismissStoreSelector,
  };
};
