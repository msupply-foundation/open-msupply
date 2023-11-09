import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import {
  useNotification,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { ListParams } from '../../api';

// Fetches temperature breaches, without raising a permission denied error if one is returned by the API
export const useTemperatureBreachNotifications = (queryParams: ListParams) => {
  const api = useTemperatureBreachApi();
  const { warning } = useNotification();
  const t = useTranslation('coldchain');

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get
      .list(queryParams)()
      .catch(e => warning(`${t('error.fetch-notifications')}: ${e.message}`)())
  );
};
