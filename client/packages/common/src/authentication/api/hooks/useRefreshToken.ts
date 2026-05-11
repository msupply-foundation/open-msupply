import {
  DateUtils,
  getAuthCookie,
  setAuthCookie,
} from '@openmsupply-client/common';
import { useGetRefreshToken } from './useGetRefreshToken';

export const TOKEN_REFRESH_BUFFER_MINUTES = 5;
export type RefreshAction = 'refresh' | 'none';

export const getRefreshAction = (expiresInMinutes: number): RefreshAction =>
  expiresInMinutes <= TOKEN_REFRESH_BUFFER_MINUTES ? 'refresh' : 'none';

export const useRefreshToken = (onTimeout: () => void) => {
  const { mutateAsync } = useGetRefreshToken();

  const refreshToken = () => {
    const authCookie = getAuthCookie();
    // authCookie.expires reports as Date but is actually a string
    const expires = DateUtils.getDateOrNull(authCookie?.expires?.toString());

    const expiresIn = expires
      ? DateUtils.differenceInMinutes(expires, Date.now(), {
          roundingMethod: 'ceil',
        })
      : 0;

    const action = getRefreshAction(expiresIn);

    if (action === 'refresh') {
      mutateAsync()
        .then(data => {
          const token = data?.token ?? '';
          if (token) {
            const newCookie = { ...authCookie, token };
            setAuthCookie(newCookie);
          } else {
            onTimeout(); // token expired -> logout
          }
        })
        .catch(() => {
          onTimeout(); // token expired/invalid -> logout
        });
    }
  };

  return { refreshToken };
};
