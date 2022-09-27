import { useEffect, useState } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  AuthenticationError,
  LocaleKey,
  initialisationStatusType,
  TypedTFunction,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { useHost } from '../../api/hooks';

const STATUS_POLLING_INTERVAL = 500;
const DEFAULT_SYNC_INTERVAL_IN_SECONDS = 300;

interface InitialiseForm {
  // Error on validation of sync credentials, there is another error for sync progress
  siteCredentialsError?: AuthenticationError;
  // true:
  // * on start of initialisation
  // * on start of retry
  // * syncStatus exists and not erroneous
  // false - default:
  // * on site credentials vaidation
  // * sync exists and erroneous
  isLoading: boolean;
  // true - default (to make form non editable while before api result is known)
  // * initialisationStatus is Initialising
  // false:
  // * initialisationStatus is PreInitialising
  isInitialising: boolean;
  // password is set to empty string if isInitialising
  password: string;
  // set to settings value from api if isInitialising
  username: string;
  // set to settings value from api if isInitialising
  url: string;
  // Used to enable polling of syncStatus and initialisationStatus
  // false by default and toggled to STATUS_POLLING_INTERVAL when isInitialising
  refetchInterval: number | false;
}

const useInitialiseFormState = () => {
  const [state, set] = useState<InitialiseForm>({
    siteCredentialsError: undefined,
    isLoading: false,
    isInitialising: true,
    password: '',
    username: '',
    url: 'https://',
    refetchInterval: false,
  });

  return {
    ...state,
    setSiteCredentialsError: (siteCredentialsError?: AuthenticationError) =>
      set(state => ({ ...state, siteCredentialsError })),
    setIsLoading: (isLoading: boolean) =>
      set(state => ({ ...state, isLoading })),
    setPassword: (password: string) => set(state => ({ ...state, password })),
    setUsername: (username: string) => set(state => ({ ...state, username })),
    setUrl: (url: string) => set(state => ({ ...state, url })),
    // When sync is already ongoing either after initialise button is pressed
    // or when initialisation page is loaded while sync is ongoing
    // inputs should be disabled and polling for syncStatus should start
    setIsInitialising: (isInitialising: boolean) =>
      set(state => ({
        ...state,
        isInitialising,
        refetchInterval: isInitialising && STATUS_POLLING_INTERVAL,
        password: '',
      })),
  };
};

// Hook will navigate to login if initialisationStatus is Initialised
export const useInitialiseForm = () => {
  const state = useInitialiseFormState();
  const navigate = useNavigate();
  const {
    setIsLoading,
    password,
    username,
    setSiteCredentialsError,
    url,
    refetchInterval,
    setIsInitialising,
    setUrl,
    setUsername,
  } = state;
  const t = useTranslation('app');
  const { mutateAsync: initialise } = useHost.sync.initialise();
  const { mutateAsync: manualSync } = useHost.sync.manualSync();
  // Both initialisationStatus and syncStatus are polled because we want to navigate
  // to login when initialisation is finished, but syncStatus will be behind auth after
  // initialisation has finished, whereas syncStatus is always an open API
  const { data: initStatus } =
    useHost.utils.initialisationStatus(refetchInterval);
  const { data: syncStatus } = useHost.utils.syncStatus(refetchInterval);
  const { data: syncSettings } = useHost.utils.syncSettings();

  const onInitialise = async () => {
    setSiteCredentialsError();
    setIsLoading(true);
    const syncSettings = {
      intervalSeconds: DEFAULT_SYNC_INTERVAL_IN_SECONDS,
      password,
      url,
      username,
    };
    try {
      await initialise(syncSettings);
      setIsInitialising(true);
    } catch (e) {
      setSiteCredentialsError({
        message: parseSyncErrorMessage(
          (e as Error)?.message,
          'error.unable_to_save_settings',
          t
        ),
      });
      return setIsLoading(false);
    }
  };

  const onRetry = async () => {
    setIsLoading(true);
    await manualSync();
  };

  useEffect(() => {
    if (!initStatus) return;

    switch (initStatus) {
      case initialisationStatusType.Initialised:
        return navigate(`/${AppRoute.Login}`, { replace: true });
      case initialisationStatusType.Initialising:
        return setIsInitialising(true);
      case initialisationStatusType.PreInitialisation:
        return setIsInitialising(false);
    }
  }, [initStatus]);

  useEffect(() => {
    if (!syncStatus) return;
    // Need to be able to retry is syncStatus is erroneous
    setIsLoading(!syncStatus.error);
  }, [syncStatus]);

  useEffect(() => {
    // If page is loaded or reloaded when isInitialising
    // url and username should be set from api result
    if (
      initStatus === initialisationStatusType.Initialising &&
      syncSettings?.username &&
      syncSettings?.url
    ) {
      setUsername(syncSettings.username);
      setUrl(syncSettings.url);
    }
  }, [syncSettings, initStatus]);

  return {
    isValid: !!username && !!password && !!url,
    onInitialise,
    onRetry,
    ...state,
    syncStatus,
  };
};

const parseSyncErrorMessage = (
  message: string,
  defaultKey: LocaleKey,
  t: TypedTFunction<LocaleKey>
) => {
  const matches = /code: "([a-zA-Z_]+?)"/g.exec(message);
  const key =
    matches && matches.length > 1
      ? (`error.${matches[1]}` as LocaleKey)
      : defaultKey;

  return t(key);
};
