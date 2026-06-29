import { useCallback, useEffect, useState } from 'react';
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

interface State {
  from?: Location;
}

export const useLoginForm = (navigateOnSuccess = true) => {
  const { data: initStatus } = useInitialisationStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const { mostRecentUsername, login, isLoggingIn } = useAuthContext();
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  const [error, setError] = useState<AuthenticationError | undefined>();
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [storeSelectorUsername, setStoreSelectorUsername] = useState('');
  const [loginRedirectFrom, setLoginRedirectFrom] = useState('/');

  // Credentials are owned by the form fields (see LoginLayout). onLogin
  // receives them as arguments so that typing never re-renders this hook's
  // consumer (and therefore never re-renders the whole login page).
  const onLogin = useCallback(
    async (username: string, password: string) => {
      setError(undefined);
      const trimmedUsername = username.trim();
      const { error, token } = await login(trimmedUsername, password);
      setError(error);
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
      const skipPrefs =
        LocalStorage.getItem('/login/skip-store-selector') ?? {};
      const optedOut = !!skipPrefs[trimmedUsername.toLowerCase()];

      if (enabledStoreCount > 1 && !optedOut) {
        setStoreSelectorUsername(trimmedUsername);
        setShowStoreSelector(true);
      } else {
        navigate(redirectTo, { replace: true });
      }
    },
    [authApi, location, login, navigate, navigateOnSuccess, queryClient]
  );

  const dismissStoreSelector = useCallback(() => {
    setShowStoreSelector(false);
    navigate(loginRedirectFrom, { replace: true });
  }, [navigate, loginRedirectFrom]);

  useEffect(() => {
    if (!initStatus) return;

    if (initStatus.status != InitialisationStatusType.Initialised)
      navigate(`/${AppRoute.Initialise}`);
  }, [initStatus]);

  return {
    onLogin,
    isLoggingIn,
    error,
    siteName: initStatus?.siteName,
    showStoreSelector,
    dismissStoreSelector,
    storeSelectorUsername,
    mostRecentUsername,
  };
};
