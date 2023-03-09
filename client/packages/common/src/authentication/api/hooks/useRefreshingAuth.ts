import { useEffect, useState } from 'react';
import {
  //   AuthCookie,
  getAuthCookie,
  setAuthCookie,
  useGql,
} from '@openmsupply-client/common';
import { useGetRefreshToken } from './useGetRefreshToken';

export const useRefreshingAuth = ({
  //   setCookie,
  token,
}: {
  //   setCookie: (cookie?: AuthCookie) => void;
  token?: string;
}) => {
  const [newToken, setNewToken] = useState<string>('');
  const { setHeader } = useGql();
  setHeader('Authorization', `Bearer ${token}`);
  const { data, enabled, isSuccess } = useGetRefreshToken(token ?? '');
  useEffect(() => {
    if (isSuccess && enabled) {
      const authCookie = getAuthCookie();
      const newCookie = { ...authCookie, token: data?.token ?? '' };
      setAuthCookie(newCookie);
      //   setCookie(newCookie);
      setNewToken(data?.token ?? '');
    }
  }, [enabled, isSuccess, data]);

  return { newToken };
};
