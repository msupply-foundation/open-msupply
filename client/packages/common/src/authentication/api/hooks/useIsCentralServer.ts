import { useQuery } from 'react-query';
import { useAuthApi } from './useAuthApi';
import { useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';

export const useIsCentralServerApi = () => {
  const api = useAuthApi();
  // api.keys.isCentralServer and "refetchOnMount: false" should guarantee that this is called just once, on page load
  const { data } = useQuery(
    api.keys.isCentralServer,
    () => api.get.isCentralServer(),
    {
      refetchOnMount: false,
    }
  );
  return !!data;
};

const returnOrFallback =
  (isCentralServer: boolean, fallback: () => void) =>
  <T>(f: T | (() => void)) =>
    isCentralServer ? f : fallback;

export const useCentralServerCallback = () => {
  const { warning } = useNotification();
  const isCentralServer = useIsCentralServerApi();
  const t = useTranslation('common');

  return {
    executeIfCentralOrShowWarning: returnOrFallback(
      isCentralServer,
      warning(t('auth.not-a-central-server'))
    ),
  };
};
