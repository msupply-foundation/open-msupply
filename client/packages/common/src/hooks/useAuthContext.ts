import { useEffect } from 'react';
import { useLocalStorage } from '../localStorage';
import { Store, User } from '../types';
import { useHostContext } from './useHostContext';
import Cookies from 'js-cookie';
import { addMinutes } from 'date-fns';
import { useOmSupplyApi } from '../api';

const COOKIE_LIFETIME_MINUTES = 60;

interface AuthCookie {
  store?: Store;
  token: string;
  user?: User;
}

const getAuthCookie = (): AuthCookie => {
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

export const useAuthContext = () => {
  const { setStore, setUser } = useHostContext();
  const [, setMRUCredentials] = useLocalStorage('/mru/credentials');
  const { setHeader } = useOmSupplyApi();
  const { token, store } = getAuthCookie();
  const storeId = store?.id ?? '';

  const login = (user: User, token: string, store?: Store) => {
    setMRUCredentials({ username: user.name, store: store });
    setUser(user);
    if (store) setStore(store);

    const authCookie = { store, token, user };
    const expires = addMinutes(new Date(), COOKIE_LIFETIME_MINUTES);

    Cookies.set('auth', JSON.stringify(authCookie), { expires });
  };

  useEffect(() => {
    setHeader('Authorization', `Bearer ${token}`);
  }, [token]);

  return { login, storeId, token };
};
