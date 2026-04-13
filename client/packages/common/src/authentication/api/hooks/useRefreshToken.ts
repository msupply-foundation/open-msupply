import { DateUtils } from '@openmsupply-client/common';
import { useGetRefreshToken } from './useGetRefreshToken';

const TOKEN_LIFETIME_MINUTES = 60;
const TOKEN_REFRESH_BUFFER_MINUTES = 5;
const TOKEN_EXPIRY_KEY = 'token_expiry';

// Track token expiry in module scope, persisted to localStorage so it
// survives page refresh. The actual JWT is in an HttpOnly cookie — we
// only need to know *when* to trigger a refresh.
let tokenExpiry: Date | null = (() => {
  const stored = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return stored ? new Date(stored) : null;
})();

export const setTokenExpiry = (expires: Date) => {
  tokenExpiry = expires;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expires.toISOString());
};

export const clearTokenExpiry = () => {
  tokenExpiry = null;
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

export const useRefreshToken = (onTimeout: () => void) => {
  const { mutateAsync } = useGetRefreshToken();

  const doRefresh = () => {
    mutateAsync()
      .then(data => {
        if (data?.token) {
          setTokenExpiry(
            DateUtils.addMinutes(new Date(), TOKEN_LIFETIME_MINUTES)
          );
        } else {
          onTimeout();
        }
      })
      .catch(() => onTimeout());
  };

  const refreshToken = () => {
    if (!tokenExpiry) {
      doRefresh();
      return;
    }

    const minutesLeft = DateUtils.differenceInMinutes(
      tokenExpiry,
      Date.now(),
      { roundingMethod: 'ceil' }
    );

    if (minutesLeft <= TOKEN_REFRESH_BUFFER_MINUTES) {
      doRefresh();
    }
  };

  return { refreshToken };
};
