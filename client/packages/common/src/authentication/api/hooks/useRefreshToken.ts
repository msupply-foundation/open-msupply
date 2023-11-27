import {
  INACTIVITY_TIMEOUT_MINUTES,
  DateUtils,
  getAuthCookie,
  setAuthCookie,
  useGql,
} from '@openmsupply-client/common';
import { useGetRefreshToken } from './useGetRefreshToken';

export const useRefreshToken = (onTimeout: () => void) => {
  const { mutateAsync } = useGetRefreshToken();
  const {
    setHeader,
    client: { getLastRequestTime },
  } = useGql();

  const refreshToken = () => {
    const authCookie = getAuthCookie();
    // authCookie.expires reports as Date but is actually a string
    const expires = DateUtils.getDateOrNull(authCookie?.expires?.toString());

    const expiresIn = expires
      ? DateUtils.differenceInMinutes(expires, Date.now(), {
          roundingMethod: 'ceil',
        })
      : 0;

    const minutesSinceLastRequest = DateUtils.differenceInMinutes(
      Date.now(),
      getLastRequestTime()
    );

    const expiresSoon = expiresIn === 1 || expiresIn === 2;

    if (minutesSinceLastRequest >= INACTIVITY_TIMEOUT_MINUTES) {
      onTimeout();
      return;
    }

    if (expiresSoon && minutesSinceLastRequest < INACTIVITY_TIMEOUT_MINUTES) {
      mutateAsync().then(data => {
        const token = data?.token ?? '';
        const newCookie = { ...authCookie, token };
        setAuthCookie(newCookie);
        setHeader('Authorization', `Bearer ${token}`);
      });
    }
  };
  return { refreshToken };
};
