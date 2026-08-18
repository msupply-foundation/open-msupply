import { useEffect, useState } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  useNavigate,
  useTranslation,
  ErrorWithDetailsProps,
  InitialisationStatusType,
  useInitialisationStatus,
  useNativeClient,
  SyncErrorVariantV7,
} from '@openmsupply-client/common';
import { useSync, mapSyncError } from '@openmsupply-client/system';

const STATUS_POLLING_INTERVAL = 500;
const DEFAULT_SYNC_INTERVAL_IN_SECONDS = 300;
// A fresh site can land on WaitingForCentralV7Upgrade: the central server has
// asked the legacy central to move this site onto the current sync protocol and
// is waiting for its own sync to deliver the result. The server now triggers
// that sync immediately (open-msupply#12650), so a short poll of quiet retries
// turns a scary red error + manual retry into a few seconds' wait — matching
// the new frontend (open-msupply-frontend#972).
const CENTRAL_WAIT_RETRY_INTERVAL_MS = 5000;
const CENTRAL_WAIT_RETRY_ATTEMPTS = 12;

interface InitialiseForm {
  // Error on validation of sync credentials, there is another error for sync progress
  siteCredentialsError: ErrorWithDetailsProps | null;
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
  // Optional sync batch size override; null = use server defaults
  batchSize: number | null;
  // Used to enable polling of syncStatus and initialisationStatus
  // false by default and toggled to STATUS_POLLING_INTERVAL when isInitialising
  refetchInterval: number | false;
  // true while quietly retrying because the central server has not yet prepared
  // this site (WaitingForCentralV7Upgrade); shows a friendly notice in place of
  // the red error, no user action needed.
  waitingForCentral: boolean;
}

const useInitialiseFormState = () => {
  const [state, set] = useState<InitialiseForm>({
    siteCredentialsError: null,
    isLoading: false,
    isInitialising: true,
    password: '',
    username: '',
    url: 'https://',
    batchSize: null,
    refetchInterval: false,
    waitingForCentral: false,
  });

  return {
    ...state,
    setSiteCredentialsError: (
      siteCredentialsError: InitialiseForm['siteCredentialsError']
    ) => set(state => ({ ...state, siteCredentialsError })),
    setIsLoading: (isLoading: boolean) =>
      set(state => ({ ...state, isLoading })),
    setPassword: (password: string) => set(state => ({ ...state, password })),
    setUsername: (username: string) => set(state => ({ ...state, username })),
    setUrl: (url: string) => set(state => ({ ...state, url })),
    setBatchSize: (batchSize: number | null) =>
      set(state => ({ ...state, batchSize })),
    setWaitingForCentral: (waitingForCentral: boolean) =>
      set(state => ({ ...state, waitingForCentral })),
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
    batchSize,
    refetchInterval,
    setIsInitialising,
    setUrl,
    setUsername,
    setBatchSize,
    setWaitingForCentral,
  } = state;
  const t = useTranslation();
  const { mutateAsync: initialise } = useSync.sync.initialise();
  const { mutateAsync: manualSync } = useSync.sync.manualSync();
  // Both initialisationStatus and syncStatus are polled because we want to navigate
  // to login when initialisation is finished, but syncStatus will be behind auth after
  // initialisation has finished, whereas syncStatus is always an open API
  const { data: initStatus } = useInitialisationStatus(refetchInterval);
  // No auth during init — use unauthenticated subscription
  const { data: syncStatus } = useSync.utils.syncStatus(refetchInterval, undefined, false);
  const { data: syncSettings } = useSync.settings.syncSettings();
  const { allowSleep, keepAwake } = useNativeClient();

  const onInitialise = async () => {
    setSiteCredentialsError(null);
    setWaitingForCentral(false);
    setIsLoading(true);

    // Snapshot once: the fields are locked for the whole loop, and
    // setIsInitialising() would blank the password before a later retry.
    const settings = {
      intervalSeconds: DEFAULT_SYNC_INTERVAL_IN_SECONDS,
      password,
      url,
      username,
      batchSize: batchSize ?? undefined,
    };

    for (let attempt = 0; ; attempt++) {
      let response: Awaited<ReturnType<typeof initialise>>;
      try {
        response = await initialise(settings);
      } catch (e) {
        // Set standard error
        setWaitingForCentral(false);
        setSiteCredentialsError({
          error: t('error.unable-to-initialise'),
          details: (e as Error)?.message || '',
        });
        return setIsLoading(false);
      }

      // The one transient variant: hold the form locked, show the waiting
      // notice, and try again after the interval until the budget is spent.
      const isWaitingForCentral =
        response.__typename === 'SyncErrorV7Node' &&
        response.variantV7 === SyncErrorVariantV7.WaitingForCentralV7Upgrade;
      if (isWaitingForCentral && attempt < CENTRAL_WAIT_RETRY_ATTEMPTS) {
        setWaitingForCentral(true);
        await new Promise(resolve =>
          setTimeout(resolve, CENTRAL_WAIT_RETRY_INTERVAL_MS)
        );
        continue;
      }

      // Any other structured error (or the wait budget exhausted) is real —
      // map it and unlock the form.
      if (
        response.__typename === 'SyncErrorNode' ||
        response.__typename === 'SyncErrorV7Node'
      ) {
        setWaitingForCentral(false);
        setSiteCredentialsError(
          mapSyncError(t, response, 'error.unable-to-initialise')
        );
        return setIsLoading(false);
      }

      break; // SyncSettingsNode — initialisation accepted
    }

    setWaitingForCentral(false);
    setIsInitialising(true);
  };

  const onRetry = async () => {
    setIsLoading(true);
    await manualSync();
  };

  useEffect(() => {
    if (!initStatus) return;

    const handleStatus = async (status: InitialisationStatusType) => {
      switch (status) {
        case InitialisationStatusType.Initialised:
          await allowSleep();
          navigate(`/${AppRoute.Login}`, { replace: true });
          break;
        case InitialisationStatusType.Initialising:
          await keepAwake();
          setIsInitialising(true);
          break;
        case InitialisationStatusType.PreInitialisation:
          await allowSleep();
          setIsInitialising(false);
          break;
      }
    };
    handleStatus(initStatus.status);
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
      initStatus?.status === InitialisationStatusType.Initialising &&
      !!syncSettings
    ) {
      setUsername(syncSettings.username);
      setUrl(syncSettings.url);
      setBatchSize(syncSettings.batchSize ?? null);
    }
  }, [syncSettings, initStatus]);

  return {
    isValid: !!username && !!password && !!url,
    onInitialise,
    onRetry,
    ...state,
    syncStatus,
    siteName: initStatus?.siteName,
  };
};
