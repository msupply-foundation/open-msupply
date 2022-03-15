import React, { createContext, FC, useMemo, useState } from 'react';
import { useDefaultLanguage, useI18N, isSupportedLang } from '@common/intl';
import { useLocalStorage } from '../localStorage';
import Cookies from 'js-cookie';
import { addMinutes } from 'date-fns';
import { useGql } from '../api';
import { useGetRefreshToken } from './api/hooks';
import { useGetAuthToken } from './api/hooks/useGetAuthToken';
import { AuthenticationResponse } from './api';

export const COOKIE_LIFETIME_MINUTES = 60;

type User = {
  id: string;
  name: string;
};

interface Store {
  __typename: 'StoreNode';
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
  setStore: (store: Store) => void;
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

const setAuthCookie = (cookie: AuthCookie) => {
  const expires = addMinutes(new Date(), COOKIE_LIFETIME_MINUTES);
  const authCookie = { ...cookie, expires };

  Cookies.set('auth', JSON.stringify(authCookie), { expires });
};

const useRefreshingAuth = (token?: string) => {
  const { setHeader } = useGql();
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
  setStore: () => {},
});

const { Provider } = AuthContext;

export const AuthProvider: FC = ({ children }) => {
  const [mostRecentlyUsedCredentials, setMRUCredentials] =
    useLocalStorage('/mru/credentials');
  const i18n = useI18N();
  const defaultLanguage = useDefaultLanguage();
  const { mutateAsync, isLoading: isLoggingIn } = useGetAuthToken();
  const { token: cookieToken, store: cookieStore, user } = getAuthCookie();
  const [localStore, setLocalStore] = useState<Store | undefined>(cookieStore);
  const [localToken, setLocalToken] = useState<string | undefined>(cookieToken);
  const storeId = localStore?.id ?? '';

  useRefreshingAuth(localToken);

  const login = async (username: string, password: string, store?: Store) => {
    const { token, error } = await mutateAsync({ username, password });
    const authCookie = {
      store,
      token: token,
      user: { id: '', name: username },
    };

    // When the a user first logs in, check that their browser language is an internally supported
    // language. If not, set their language to the default.
    const { language } = i18n;
    if (!isSupportedLang(language)) i18n.changeLanguage(defaultLanguage);

    setMRUCredentials({ username, store });
    if (!!token) setLocalStore(store);
    setLocalToken(token);
    setAuthCookie(authCookie);

    return { token, error };
  };

  const setStore = (store: Store) => {
    if (!localToken) return;

    setLocalStore(store);
    setMRUCredentials({ username: user?.name ?? '', store });
    const authCookie = getAuthCookie();
    setAuthCookie({ ...authCookie, store });
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
      setStore,
    }),
    [
      login,
      localStore,
      localToken,
      user,
      mostRecentlyUsedCredentials,
      isLoggingIn,
      setStore,
    ]
  );

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
