import { useTemperatureNotificationApi } from '../utils/useTemperatureNotificationApi';
import {
  useNotification,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { ListParams } from '../../api';

export const useTemperatureNotifications = (queryParams: ListParams) => {
  const api = useTemperatureNotificationApi();
  const { warning } = useNotification();
  const t = useTranslation('coldchain');

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get
      .list(queryParams)()
      .catch(e => warning(`${t('error.fetch-notifications')}: ${e.message}`)())
  );
};
