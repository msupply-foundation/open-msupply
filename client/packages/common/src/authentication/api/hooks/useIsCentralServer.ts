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

const isCentralServerOrWarning =
  (isCentralServer: Boolean, orDo: () => void) =>
  <T>(f: T | (() => void)) =>
    isCentralServer ? f : orDo;

export const useIsCentralServerOrWarning = () => {
  const { warning } = useNotification();
  const isCentralServer = useIsCentralServerApi();
  const t = useTranslation('common');

  return isCentralServerOrWarning(
    isCentralServer,
    warning(t('auth.not-a-central-server'))
  );
};
