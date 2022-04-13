import React, { createContext, FC, useMemo, useState, useEffect } from 'react';
import { IntlUtils } from '@common/intl';
import { useLocalStorage } from '../localStorage';
import Cookies from 'js-cookie';
import { addMinutes } from 'date-fns';
import { useGql } from '../api';
import { useGetRefreshToken } from './api/hooks';
import { useGetAuthToken } from './api/hooks/useGetAuthToken';
import { useUserDetails } from './api/hooks/useUserDetails';
import { AuthenticationResponse } from './api';
import { UserStoreNodeFragment } from './api/operations.generated';

export const COOKIE_LIFETIME_MINUTES = 60;
const TOKEN_CHECK_INTERVAL = 60 * 1000;

export enum AuthError {
  NoStoreAssigned = 'NoStoreAssigned',
  PermissionDenied = 'Forbidden',
  Unauthenticated = 'Unauthenticated',
}

type User = {
  id: string;
  name: string;
};

interface AuthCookie {
  expires?: Date;
  store?: UserStoreNodeFragment;
  token: string;
  user?: User;
}

type MRUCredentials = {
  store?: UserStoreNodeFragment;
  username?: string;
};

interface AuthControl {
  error?: AuthError | null;
  isLoggingIn: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<AuthenticationResponse>;
  logout: () => void;
  mostRecentlyUsedCredentials?: MRUCredentials | null;
  setError?: (error: AuthError) => void;
  setStore: (store: UserStoreNodeFragment) => void;
  store?: UserStoreNodeFragment;
  storeId: string;
  token: string;
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
  token: '',
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
  const [error, setError] = useLocalStorage('/auth/error');
  const storeId = cookie?.store?.id ?? '';
  const { mutateAsync: getStores } = useUserDetails();
  const { setHeader } = useGql();

  const saveToken = (token?: string) => {
    const authCookie = getAuthCookie();
    const newCookie = { ...authCookie, token: token ?? '' };
    setAuthCookie(newCookie);
    setCookie(newCookie);
  };
  useRefreshingAuth(saveToken, cookie?.token);

  // returns MRU store, if set
  // or the first store in the list
  const getStore = async (token?: string) => {
    const userDetails = await getStores(token);
    const defaultStore = userDetails?.defaultStore;
    const stores = userDetails?.stores.nodes;

    if (
      mostRecentlyUsedCredentials?.store &&
      stores?.some(store => store.id === mostRecentlyUsedCredentials?.store?.id)
    ) {
      return (
        stores.find(
          store => store.id === mostRecentlyUsedCredentials.store?.id
        ) || mostRecentlyUsedCredentials.store
      );
    }

    if (!!defaultStore) return defaultStore;

    return !!stores && stores?.length > 0 ? stores?.[0] : undefined;
  };

  const login = async (username: string, password: string) => {
    const { token, error } = await mutateAsync({ username, password });
    setHeader('Authorization', `Bearer ${token}`);
    const store = await getStore(token);
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
    setError(store ? undefined : AuthError.NoStoreAssigned);

    return { token, error };
  };

  const setStore = (store: UserStoreNodeFragment) => {
    if (!cookie?.token) return;

    setMRUCredentials({
      username: mostRecentlyUsedCredentials?.username ?? '',
      store,
    });
    const newCookie = { ...cookie, store };
    setAuthCookie(newCookie);
    setCookie(newCookie);
  };

  const logout = () => {
    Cookies.remove('auth');
    setError(undefined);
    setCookie(undefined);
  };

  const val = useMemo(
    () => ({
      error,
      isLoggingIn,
      login,
      logout,
      storeId,
      token: cookie?.token || '',
      user: cookie?.user,
      store: cookie?.store,
      mostRecentlyUsedCredentials,
      setStore,
      setError,
    }),
    [
      login,
      cookie,
      error,
      mostRecentlyUsedCredentials,
      isLoggingIn,
      setStore,
      setError,
    ]
  );

  useEffect(() => {
    // check every minute for a valid token
    // if the cookie has expired, raise an auth error
    const timer = window.setInterval(() => {
      const authCookie = getAuthCookie();
      const { token } = authCookie;

      if (!token) {
        setError(AuthError.Unauthenticated);
        window.clearInterval(timer);
      }
    }, TOKEN_CHECK_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
