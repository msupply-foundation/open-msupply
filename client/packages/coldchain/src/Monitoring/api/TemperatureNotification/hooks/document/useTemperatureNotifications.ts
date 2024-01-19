import { useTemperatureNotificationApi } from '../utils/useTemperatureNotificationApi';
import {
  useNotification,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { ListParams } from '../../api';

const POLLING_INTERVAL_IN_MINUTES = 5;

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
      cacheTime: 0,
      refetchInterval: 1000 * 60 * POLLING_INTERVAL_IN_MINUTES,
    }
  );
};
