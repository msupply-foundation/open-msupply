import { IntlUtils } from '@common/intl';
import { AuthCookie, AuthError, setAuthCookie } from '../../AuthContext';
import { useGetAuthToken } from './useGetAuthToken';
import {
  LocalStorage,
  useAuthApi,
  useGetUserDetails,
  useGetUserPermissions,
  useGql,
  useLocalStorage,
  useQueryClient,
} from '@openmsupply-client/common';
import { UserNode } from '@common/types';

import { DefinitionNode, DocumentNode, OperationDefinitionNode } from 'graphql';

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

export const useLogin = (
  setCookie: React.Dispatch<React.SetStateAction<AuthCookie | undefined>>
) => {
  const { mutateAsync, isLoading: isLoggingIn } = useGetAuthToken();
  const changeLanguage = IntlUtils.useChangeLanguage();
  const { setHeader, setSkipRequest } = useGql();
  const { mutateAsync: getUserDetails } = useGetUserDetails();
  const queryClient = useQueryClient();
  const api = useAuthApi();
  const [mostRecentlyUsedCredentials, setMRUCredentials] =
    useLocalStorage('/mru/credentials');
  const getUserPermissions = useGetUserPermissions();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_error, setError, removeError] = useLocalStorage('/auth/error');

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

  const login = async (username: string, password: string) => {
    const { token, error } = await mutateAsync({ username, password });
    setHeader('Authorization', `Bearer ${token}`);
    const userDetails = await getUserDetails(token);
    queryClient.setQueryData(api.keys.me(token), userDetails);
    const store = await getStore(userDetails);
    const permissions = await getUserPermissions(token, store);
    setSkipRequest(skipNoStoreRequests);
    const authCookie = {
      store,
      token,
      user: {
        id: '',
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

  return { isLoggingIn, login };
};
