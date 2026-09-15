import { useEffect } from 'react';
import {
  AuthError,
  LIST_KEY,
  useNotification,
  useQuery,
  useTranslation,
  useAuthContext,
  useLocalStorage,
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
  const [authError] = useLocalStorage('/error/auth');

  const canViewSensorDetails = userHasPermission(UserPermission.SensorQuery);
  const queryKey = [TEMPERATURE_NOTIFICATION, storeId, LIST_KEY, queryParams];

  const queryFn = async () => {
    const { first, offset } = queryParams ?? {};

    const result = await temperatureNotificationApi.temperatureNotifications({
      storeId,
      page: { offset, first },
    });

    return result?.temperatureNotifications;
  };

  const query = useQuery({
    queryKey,
    queryFn,
    gcTime: POLLING_INTERVAL_MS,
    refetchInterval: POLLING_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
    enabled: !!storeId && canViewSensorDetails,
  });

  const { isError, error } = query;

  useEffect(() => {
    // Notify on the error state rather than inside queryFn, so the toast is
    // shown once per failure instead of once per (retried) request.
    // Skip when the user is no longer authenticated (e.g. logged out due to
    // inactivity) - a failed background poll isn't actionable for them. A
    // stale token may still be present, so gate on the auth error instead.
    const isLoggedOut =
      authError === AuthError.Unauthenticated ||
      authError === AuthError.Timeout;
    if (!isError || isLoggedOut) return;

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    warning(`${t('error.fetch-notifications')}: ${errorMessage}`)();
  }, [isError, error, authError, warning, t]);

  return query;
};
