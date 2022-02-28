import React, {
  createContext,
  FC,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Store, User } from '@common/types';
import { useLocalStorage } from '../localStorage';
import Cookies from 'js-cookie';
import { addMinutes, differenceInMinutes } from 'date-fns';
import { useOmSupplyApi } from '../api';
import { useGetRefreshToken } from './api/hooks';
import { useGetAuthToken } from './api/hooks/useGetAuthToken';
import { AuthenticationResponse } from './api';

const COOKIE_LIFETIME_MINUTES = 60;

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

const useRefreshingAuth = () => {
  const { mutate: refreshToken } = useGetRefreshToken();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const { expires, token } = getAuthCookie();
  const cookieLifetimeInMinutes = differenceInMinutes(
    new Date(expires ?? ''),
    new Date()
  );
  const timeoutInterval =
    (cookieLifetimeInMinutes > 0 ? cookieLifetimeInMinutes : 0.3) * 60 * 1000;

  React.useEffect(() => {
    if (token) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(refreshToken, timeoutInterval);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [token]);
};

const AuthContext = createContext<AuthControl>({
  isLoggingIn: false,
  login: () =>
    new Promise(() => ({
      token: '',
    })),
  storeId: '',
});

const { Provider } = AuthContext;

export const AuthProvider: FC = ({ children }) => {
  const [mostRecentlyUsedCredentials, setMRUCredentials] =
    useLocalStorage('/mru/credentials');
  const { setHeader } = useOmSupplyApi();
  const { mutateAsync, isLoading: isLoggingIn } = useGetAuthToken();
  const { token, store: storeCookie, user } = getAuthCookie();
  const [localStore, setLocalStore] = useState<Store | undefined>(storeCookie);
  const storeId = localStore?.id ?? '';

  useRefreshingAuth();

  const login = async (username: string, password: string, store?: Store) => {
    const response = await mutateAsync({ username, password });
    const expires = addMinutes(new Date(), COOKIE_LIFETIME_MINUTES);
    const authCookie = {
      expires,
      store,
      token: response.token,
      user: { id: '', name: username },
    };

    setMRUCredentials({ username, store: store });
    if (!!token) setLocalStore(store);
    Cookies.set('auth', JSON.stringify(authCookie), { expires });

    return response;
  };

  useEffect(() => {
    setHeader('Authorization', `Bearer ${token}`);
  }, [token]);

  const val = useMemo(
    () => ({
      isLoggingIn,
      login,
      storeId,
      token,
      user,
      store: localStore,
      mostRecentlyUsedCredentials,
    }),
    [login, localStore, token, user, mostRecentlyUsedCredentials, isLoggingIn]
  );

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
