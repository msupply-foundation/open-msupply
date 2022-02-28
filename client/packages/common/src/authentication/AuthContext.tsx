import React, { createContext, FC, useEffect, useMemo } from 'react';
import { Store, User } from '@common/types';
import { useLocalStorage } from '../localStorage';
import { useHostContext } from '../hooks/useHostContext';
import Cookies from 'js-cookie';
import { addMinutes } from 'date-fns';
import { useOmSupplyApi } from '../api';

const COOKIE_LIFETIME_MINUTES = 60;

interface AuthCookie {
  store?: Store;
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
interface AuthControl {
  onLoggedIn: (user: User, token: string, store?: Store) => void;
  storeId?: string;
  token?: string;
  user?: User;
  store?: Store;
}

const AuthContext = createContext<AuthControl>({
  onLoggedIn: () => {},
});

const { Provider } = AuthContext;

export const AuthProvider: FC = ({ children }) => {
  const { setStore, setUser } = useHostContext();
  const [, setMRUCredentials] = useLocalStorage('/mru/credentials');
  const { setHeader } = useOmSupplyApi();
  const { token, store, user } = getAuthCookie();
  const storeId = store?.id ?? '';

  const onLoggedIn = (user: User, token: string, store?: Store) => {
    setMRUCredentials({ username: user.name, store: store });

    const authCookie = { store, token, user };
    const expires = addMinutes(new Date(), COOKIE_LIFETIME_MINUTES);

    Cookies.set('auth', JSON.stringify(authCookie), { expires });
    setUser(user);
    if (store) setStore(store);
  };

  useEffect(() => {
    setHeader('Authorization', `Bearer ${token}`);
  }, [token]);

  const val = useMemo(
    () => ({ onLoggedIn, storeId, token, user, store }),
    [onLoggedIn, store, token, user]
  );

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
