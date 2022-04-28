import create from 'zustand';
import { AppRoute } from '@openmsupply-client/config';
import { AuthenticationError, useNavigate } from '@openmsupply-client/common';
import { useHost } from '../api/hooks';

interface InitialiseForm {
  error?: AuthenticationError;
  isLoading: boolean;
  password: string;
  siteId?: number;
  username: string;
  url: string;
  setError: (error?: AuthenticationError) => void;
  setIsLoading: (isLoading: boolean) => void;
  setPassword: (password: string) => void;
  setUsername: (username: string) => void;
  setSiteId: (siteId: number) => void;
  setUrl: (url: string) => void;
}

const useInitialiseFormState = create<InitialiseForm>(set => ({
  error: undefined,
  isLoading: false,
  password: '',
  username: '',
  url: '',
  siteId: undefined,
  setError: (error?: AuthenticationError) =>
    set(state => ({ ...state, error })),
  setIsLoading: (isLoading: boolean) => set(state => ({ ...state, isLoading })),
  setPassword: (password: string) => set(state => ({ ...state, password })),
  setUsername: (username: string) => set(state => ({ ...state, username })),
  setUrl: (url: string) => set(state => ({ ...state, url })),
  setSiteId: (siteId: number) => set(state => ({ ...state, siteId })),
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
    siteId,
  } = state;
  const { mutateAsync: update } = useHost.sync.update();

  const onSave = async () => {
    setError();
    setIsLoading(true);
    const syncSettings = {
      centralServerSiteId: 1,
      intervalSec: 300,
      password,
      siteHardwareId: '',
      siteId: siteId || 2,
      url,
      username,
    };

    await update(syncSettings).catch(e => {
      console.error(e);
      setError({ message: 'Unable to save settings' });
      setIsLoading(false);
      return;
    });
    setPassword('');

    await restart().catch(e => {
      console.error(e);
      setError({ message: 'Unable to restart the server' });
      setIsLoading(false);
      return;
    });

    setIsLoading(false);

    navigate(`/${AppRoute.Login}`, { replace: true });
  };

  const isValid = !!username && !!password && !!url;

  return {
    isValid,
    onSave,
    ...state,
    error,
  };
};
