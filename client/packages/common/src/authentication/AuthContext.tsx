import React, { createContext, useMemo, useState, useEffect, FC } from 'react';
import { IntlUtils } from '@common/intl';
import { AppRoute } from '@openmsupply-client/config';
import { LocalStorage, useLocalStorage } from '../localStorage';
import Cookies from 'js-cookie';
import addMinutes from 'date-fns/addMinutes';
import { useGql } from '../api';
import { useGetRefreshToken } from './api/hooks';
import { useGetAuthToken } from './api/hooks/useGetAuthToken';
import { useUserDetails, useUserPermissions } from './api/hooks/useUserDetails';
import { AuthenticationResponse } from './api';
import { UserStoreNodeFragment } from './api/operations.generated';
import { PropsWithChildrenOnly, UserNode, UserPermission } from '@common/types';
import { RouteBuilder } from '../utils/navigation';
import { matchPath } from 'react-router-dom';
import { DefinitionNode, DocumentNode, OperationDefinitionNode } from 'graphql';

export const COOKIE_LIFETIME_MINUTES = 60;
const TOKEN_CHECK_INTERVAL = 60 * 1000;

export enum AuthError {
  NoStoreAssigned = 'NoStoreAssigned',
  PermissionDenied = 'Forbidden',
  ServerError = 'ServerError',
  Unauthenticated = 'Unauthenticated',
  Timeout = 'Timeout',
}

type User = {
  id: string;
  name: string;
  permissions: UserPermission[];
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
  setStore: (store: UserStoreNodeFragment) => Promise<void>;
  store?: UserStoreNodeFragment;
  storeId: string;
  token: string;
  user?: User;
  userHasPermission: (permission: UserPermission) => boolean;
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
  setStore: () => new Promise(() => ({})),
  userHasPermission: () => false,
});

const { Provider } = AuthContext;

export const AuthProvider: FC<PropsWithChildrenOnly> = ({ children }) => {
  const [mostRecentlyUsedCredentials, setMRUCredentials] =
    useLocalStorage('/mru/credentials');
  const changeLanguage = IntlUtils.useChangeLanguage();
  const { mutateAsync, isLoading: isLoggingIn } = useGetAuthToken();
  const authCookie = getAuthCookie();
  const [cookie, setCookie] = useState<AuthCookie | undefined>(authCookie);
  const [error, setError, removeError] = useLocalStorage('/auth/error');
  const storeId = cookie?.store?.id ?? '';
  const { mutateAsync: getStores } = useUserDetails();
  const { mutateAsync: getPermissions } = useUserPermissions();
  const { setHeader, setSkipRequest } = useGql();

  const saveToken = (token?: string) => {
    const authCookie = getAuthCookie();
    const newCookie = { ...authCookie, token: token ?? '' };
    setAuthCookie(newCookie);
    setCookie(newCookie);
  };
  useRefreshingAuth(saveToken, cookie?.token);

  // returns MRU store, if set
  // or the first store in the list
  const getStore = async (userDetails?: Partial<UserNode>) => {
    const defaultStore = userDetails?.defaultStore;
    const stores = userDetails?.stores?.nodes;

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

  const getUserPermissions = async (
    token?: string,
    store?: UserStoreNodeFragment
  ): Promise<UserPermission[]> => {
    const permissions = await getPermissions({
      storeId: store?.id || '',
      token,
    });
    return permissions?.nodes?.[0]?.permissions || [];
  };

  const setLoginError = (isLoggedIn: boolean, hasValidStore: boolean) => {
    if (LocalStorage.getItem('/auth/error') === AuthError.ServerError) return;

    switch (true) {
      case isLoggedIn && hasValidStore: {
        removeError();
        break;
      }
      case !isLoggedIn: {
        setError(AuthError.Unauthenticated);
        break;
      }
      case !hasValidStore: {
        setError(AuthError.NoStoreAssigned);
        break;
      }
    }
  };

  const authNameQueries = ['authToken', 'me'];
  const isAuthRequest = (definitionNode: DefinitionNode) => {
    const operationNode = definitionNode as OperationDefinitionNode;
    if (!operationNode) return false;
    if (operationNode.operation !== 'query') return false;

    return authNameQueries.indexOf(operationNode.name?.value ?? '') !== -1;
  };

  const skipNoStoreRequests = (documentNode?: DocumentNode) => {
    if (!documentNode) return false;

    if (documentNode.definitions.some(isAuthRequest)) return false;

    switch (LocalStorage.getItem('/auth/error')) {
      case AuthError.NoStoreAssigned:
      case AuthError.Unauthenticated:
      case AuthError.Timeout:
      case AuthError.ServerError:
        return true;
      default:
        return false;
    }
  };

  const login = async (username: string, password: string) => {
    const { token, error } = await mutateAsync({ username, password });
    setHeader('Authorization', `Bearer ${token}`);
    const userDetails = await getStores(token);
    const store = await getStore(userDetails);
    const permissions = await getUserPermissions(token, store);
    setSkipRequest(skipNoStoreRequests);
    const authCookie = {
      store,
      token,
      user: {
        id: userDetails?.userId ?? '',
        name: username,
        permissions,
      },
    };

    changeLanguage(userDetails?.language);
    setMRUCredentials({ username, store });
    setAuthCookie(authCookie);
    setCookie(authCookie);
    setLoginError(!!token, !!store);
    setSkipRequest(
      () => LocalStorage.getItem('/auth/error') === AuthError.NoStoreAssigned
    );

    return { token, error };
  };

  const setStore = async (store: UserStoreNodeFragment) => {
    if (!cookie?.token) return;

    setMRUCredentials({
      username: mostRecentlyUsedCredentials?.username ?? '',
      store,
    });
    const permissions = await getUserPermissions(cookie?.token, store);
    const user = {
      id: cookie.user?.id ?? '',
      name: cookie.user?.name ?? '',
      permissions,
    };
    const newCookie = { ...cookie, store, user };
    setAuthCookie(newCookie);
    setCookie(newCookie);
  };

  const logout = () => {
    Cookies.remove('auth');
    setError(undefined);
    setCookie(undefined);
  };

  const userHasPermission = (permission: UserPermission) =>
    cookie?.user?.permissions.some(p => p === permission) || false;

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
      userHasPermission,
    }),
    [
      login,
      cookie,
      error,
      mostRecentlyUsedCredentials,
      isLoggingIn,
      setStore,
      setError,
      userHasPermission,
    ]
  );

  useEffect(() => {
    // check every minute for a valid token
    // if the cookie has expired, raise an auth error
    const timer = window.setInterval(() => {
      const authCookie = getAuthCookie();
      const { token } = authCookie;
      const isInitScreen = matchPath(
        RouteBuilder.create(AppRoute.Initialise).addWildCard().build(),
        location.pathname
      );

      const isDiscoveryScreen = matchPath(
        RouteBuilder.create(AppRoute.Discovery).addWildCard().build(),
        location.pathname
      );

      const isNotAuthPath = isDiscoveryScreen || isInitScreen;

      if (!token && !isNotAuthPath) {
        setError(AuthError.Timeout);
        window.clearInterval(timer);
      }
    }, TOKEN_CHECK_INTERVAL);
    return () => window.clearInterval(timer);
  }, [cookie?.token]);

  return <Provider value={val}>{children}</Provider>;
};

export const useAuthContext = (): AuthControl => {
  const authControl = React.useContext(AuthContext);
  return authControl;
};
