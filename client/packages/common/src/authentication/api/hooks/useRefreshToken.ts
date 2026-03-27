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

    const expiresSoon = expiresIn > 0 && expiresIn <= 5;

    if (minutesSinceLastRequest >= INACTIVITY_TIMEOUT_MINUTES) {
      onTimeout();
      return;
    }

    if (expiresSoon && minutesSinceLastRequest < INACTIVITY_TIMEOUT_MINUTES) {
      mutateAsync()
        .then(data => {
          const token = data?.token ?? '';
          // Only update the cookie if the server returned a valid token.
          // A failed refresh (e.g. expired refresh token) returns an empty
          // string which would cause the next interval check to log the user
          // out immediately.
          if (token) {
            const newCookie = { ...authCookie, token };
            setAuthCookie(newCookie);
          }
        })
        .catch(() => {
          // Silently ignore network errors during refresh. The next interval
          // tick will retry. If the cookie expires before a successful refresh,
          // the normal expiry/inactivity logic in AuthContext will handle logout.
        });
    }
  };
  return { refreshToken };
};
