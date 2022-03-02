import React, { createContext, FC, useMemo, useState } from 'react';
import { useLocalStorage } from '../localStorage';
import Cookies from 'js-cookie';
import { addMinutes } from 'date-fns';
import { useOmSupplyApi } from '../api';
import { useGetRefreshToken } from './api/hooks';
import { useGetAuthToken } from './api/hooks/useGetAuthToken';
import { AuthenticationResponse } from './api';

export const COOKIE_LIFETIME_MINUTES = 60;

type User = {
  id: string;
  name: string;
};

interface Store {
  id: string;
  code: string;
}

interface AuthCookie {
  expires?: Date;
  store?: Store;
  token: string;
  user?: User;
}

type MRUCredentials = {
  store?: Store;
  username?: string;
};

interface AuthControl {
  isLoggingIn: boolean;
  login: (
    username: string,
    password: string,
    store?: Store
  ) => Promise<AuthenticationResponse>;
  logout: () => void;
  mostRecentlyUsedCredentials?: MRUCredentials | null;
  store?: Store;
  storeId: string;
  token?: string;
  user?: User;
}

export const getAuthCookie = (): AuthCookie => {
  const authString = Cookies.get('auth');
  const emptyCookie = { token: '' };
  if (!!authString) {
    try {
      const parsed = JSON.parse(authString) as AuthCookie;
      return parsed;
    } catch {
      return emptyCookie;
    }
  }
  return emptyCookie;
};

const useRefreshingAuth = (token?: string) => {
  const { setHeader } = useOmSupplyApi();
  setHeader('Authorization', `Bearer ${token}`);
  useGetRefreshToken(token ?? '');
};

const AuthContext = createContext<AuthControl>({
  isLoggingIn: false,
  login: () =>
    new Promise(() => ({
      token: '',
    })),
  logout: () => {},
  storeId: '',
});

const { Provider } = AuthContext;

export const AuthProvider: FC = ({ children }) => {
  const [mostRecentlyUsedCredentials, setMRUCredentials] =
    useLocalStorage('/mru/credentials');
  const { mutateAsync, isLoading: isLoggingIn } = useGetAuthToken();
  const { token: cookieToken, store: cookieStore, user } = getAuthCookie();
  const [localStore, setLocalStore] = useState<Store | undefined>(cookieStore);
  const [localToken, setLocalToken] = useState<string | undefined>(cookieToken);
  const storeId = localStore?.id ?? '';

  useRefreshingAuth(localToken);

  const login = async (username: string, password: string, store?: Store) => {
    const { token, error } = await mutateAsync({ username, password });
    const expires = addMinutes(new Date(), COOKIE_LIFETIME_MINUTES);
    const authCookie = {
      expires,
      store,
      token: token,
      user: { id: '', name: username },
    };

    setMRUCredentials({ username, store: store });
    if (!!token) setLocalStore(store);
    setLocalToken(token);
    Cookies.set('auth', JSON.stringify(authCookie), { expires });

    return { token, error };
  };

  const logout = () => {
    Cookies.remove('auth');
    setLocalStore(undefined);
  };

  const val = useMemo(
    () => ({
      isLoggingIn,
      login,
      logout,
      storeId,
      token: localToken,
      user,
      store: localStore,
      mostRecentlyUsedCredentials,
    }),
    [
      login,
      localStore,
      localToken,
      user,
      mostRecentlyUsedCredentials,
      isLoggingIn,
    ]
  );

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
