import { useTemperatureNotificationApi } from '../utils/useTemperatureNotificationApi';
import {
  useNotification,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { ListParams } from '../../api';

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const POLLING_INTERVAL_MS = 3 * MILLISECONDS_PER_MINUTE;
const STALE_TIME_MS = 1 * MILLISECONDS_PER_MINUTE;

export const useTemperatureNotifications = (queryParams: ListParams) => {
  const api = useTemperatureNotificationApi();
  const { warning } = useNotification();
  const t = useTranslation('coldchain');

  return useQuery(
    api.keys.paramList(queryParams),
    () =>
      api.get
        .list(queryParams)()
        .catch(e =>
          warning(`${t('error.fetch-notifications')}: ${e.message}`)()
        ),
    {
      cacheTime: POLLING_INTERVAL_MS,
      refetchInterval: POLLING_INTERVAL_MS,
      staleTime: STALE_TIME_MS,
    }
  );
};
