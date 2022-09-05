import { useEffect, useState } from 'react';
import create from 'zustand';
import { AppRoute } from '@openmsupply-client/config';
import {
  AuthenticationError,
  AuthError,
  LocaleKey,
  LocalStorage,
  ServerStatus,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { useHost } from '../../api/hooks';

const SERVER_RESTART_TIMEOUT = 60000;
const POLLING_INTERVAL = 3000;
const POLLING_DELAY = 6000;

interface InitialiseForm {
  error?: AuthenticationError;
  isLoading: boolean;
  password: string;
  username: string;
  url: string;
  setError: (error?: AuthenticationError) => void;
  setIsLoading: (isLoading: boolean) => void;
  setPassword: (password: string) => void;
  setUsername: (username: string) => void;
  setUrl: (url: string) => void;
}

const useInitialiseFormState = create<InitialiseForm>(set => ({
  error: undefined,
  isLoading: false,
  password: '',
  username: '',
  url: 'https://',
  setError: (error?: AuthenticationError) =>
    set(state => ({ ...state, error })),
  setIsLoading: (isLoading: boolean) => set(state => ({ ...state, isLoading })),
  setPassword: (password: string) => set(state => ({ ...state, password })),
  setUsername: (username: string) => set(state => ({ ...state, username })),
  setUrl: (url: string) => set(state => ({ ...state, url })),
}));

export const useInitialiseForm = () => {
  const state = useInitialiseFormState();
  const navigate = useNavigate();
  const { mutateAsync: restart } = useHost.utils.restart();
  const {
    setIsLoading,
    password,
    setPassword,
    username,
    error,
    setError,
    url,
  } = state;
  const [isPolling, setIsPolling] = useState(false);
  const [isBootstrap, setIsBootstrap] = useState(false);
  const { mutateAsync: update } = useHost.sync.update();
  const { data } = useHost.utils.settings({
    refetchInterval: POLLING_INTERVAL,
    enabled: isPolling,
  });
  const t = useTranslation('app');
  const parseErrorMessage = (error: Error, defaultKey: LocaleKey) => {
    const matches = /code: "([a-zA-Z_]+?)"/g.exec(error?.message);
    const key =
      matches && matches.length > 1
        ? (`error.${matches[1]}` as LocaleKey)
        : defaultKey;

    return t(key);
  };

  const onSave = async () => {
    setError();
    setIsLoading(true);
    setIsBootstrap(false);
    const syncSettings = {
      intervalSec: 300,
      password,
      url,
      username,
    };
    try {
      await update(syncSettings);
      await restart().catch(e => {
        console.error(e);
        const message = parseErrorMessage(
          e as Error,
          'error.unable_to_restart_server'
        );
        setError({ message });
        setIsLoading(false);
      });
      return;
    } catch (e) {
      console.error(e);
      const message = parseErrorMessage(
        e as Error,
        'error.unable_to_save_settings'
      );
      setError({ message });
      setIsLoading(false);
    }
    setPassword('');

    setTimeout(() => {
      setIsPolling(true);
    }, POLLING_DELAY);

    LocalStorage.removeItem('/auth/error');
    LocalStorage.addListener<AuthError>((key, value) => {
      if (key === '/auth/error' && value === AuthError.Unauthenticated) {
        // Server is up! and rejecting our request!
        setIsLoading(false);
        setIsPolling(false);

        navigate(`/${AppRoute.Login}`, { replace: true });
      }
    });

    setTimeout(() => {
      setIsLoading(false);
      setIsPolling(false);
      const message = isBootstrap
        ? 'Unable to sync! Please check your settings.'
        : 'Server restart has timed out';
      setError({ message });
    }, SERVER_RESTART_TIMEOUT);
  };

  const isValid = !!username && !!password && !!url;
  useEffect(() => {
    if (!!data) setIsBootstrap(data?.status === ServerStatus.Stage_0);
  }, [data]);
  return {
    isValid,
    onSave,
    ...state,
    error,
  };
};
