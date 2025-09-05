import {
  LIST_KEY,
  useNotification,
  useQuery,
  useTranslation,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { TEMPERATURE_NOTIFICATION } from './keys';
import { useTemperatureNotificationGraphQL } from '../useTemperatureNotificationGraphQL';

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const POLLING_INTERVAL_MS = 3 * MILLISECONDS_PER_MINUTE;
const STALE_TIME_MS = 1 * MILLISECONDS_PER_MINUTE;

export interface ListParams {
  first: number;
  offset: number;
}

export const useTemperatureNotificationList = (queryParams?: ListParams) => {
  const t = useTranslation();
  const { warning } = useNotification();
  const { temperatureNotificationApi, storeId } =
    useTemperatureNotificationGraphQL();
  const { userHasPermission } = useAuthContext();

  const canViewSensorDetails = userHasPermission(UserPermission.SensorQuery);
  const queryKey = [TEMPERATURE_NOTIFICATION, storeId, LIST_KEY, queryParams];

  const queryFn = async () => {
    try {
      const { first, offset } = queryParams ?? {};

      const result = await temperatureNotificationApi.temperatureNotifications({
        storeId,
        page: { offset, first },
      });

      return result?.temperatureNotifications;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      warning(`${t('error.fetch-notifications')}: ${errorMessage}`)();

      throw error;
    }
  };

  const query = useQuery({
    queryKey,
    queryFn,
    cacheTime: POLLING_INTERVAL_MS,
    refetchInterval: POLLING_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
    enabled: !!storeId && canViewSensorDetails,
  });

  return query;
};
