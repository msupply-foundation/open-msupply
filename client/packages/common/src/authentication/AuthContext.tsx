import React, { createContext, FC, useMemo, useState, useEffect } from 'react';
import { IntlUtils } from '@common/intl';
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

const useRefreshingAuth = (
  callback: (token?: string) => void,
  token?: string
) => {
  const { setHeader } = useGql();
  setHeader('Authorization', `Bearer ${token}`);
  const { data, enabled, isSuccess } = useGetRefreshToken(token ?? '');
  useEffect(() => {
    if (isSuccess && enabled) callback(data?.token ?? '');
  }, [enabled, isSuccess, data]);
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
  const i18n = IntlUtils.useI18N();
  const defaultLanguage = IntlUtils.useDefaultLanguage();
  const { mutateAsync, isLoading: isLoggingIn } = useGetAuthToken();
  const authCookie = getAuthCookie();
  const [cookie, setCookie] = useState<AuthCookie | undefined>(authCookie);
  const storeId = cookie?.store?.id ?? '';

  const saveToken = (token?: string) => {
    const authCookie = getAuthCookie();
    const newCookie = { ...authCookie, token: token ?? '' };
    setAuthCookie(newCookie);
    setCookie(newCookie);
  };
  useRefreshingAuth(saveToken, cookie?.token);

  const login = async (username: string, password: string, store?: Store) => {
    const { token, error } = await mutateAsync({ username, password });
    const authCookie = {
      store,
      token,
      user: { id: '', name: username },
    };

    // When the a user first logs in, check that their browser language is an internally supported
    // language. If not, set their language to the default.
    const { language } = i18n;
    if (!IntlUtils.isSupportedLang(language)) {
      i18n.changeLanguage(defaultLanguage);
    }

    setMRUCredentials({ username, store });
    setAuthCookie(authCookie);
    setCookie(authCookie);

    return { token, error };
  };

  const setStore = (store: Store) => {
    if (!cookie?.token) return;

    setMRUCredentials({
      username: mostRecentlyUsedCredentials?.username ?? '',
      store,
    });
    const authCookie = getAuthCookie();
    const newCookie = { ...authCookie, store };
    setAuthCookie(newCookie);
    setCookie(newCookie);
  };

  const logout = () => {
    Cookies.remove('auth');
    setCookie(undefined);
  };

  const val = useMemo(
    () => ({
      isLoggingIn,
      login,
      logout,
      storeId,
      token: cookie?.token,
      user: cookie?.user,
      store: cookie?.store,
      mostRecentlyUsedCredentials,
      setStore,
    }),
    [login, cookie, mostRecentlyUsedCredentials, isLoggingIn, setStore]
  );

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
