import { AuthCookie, setAuthCookie } from '../../AuthContext';
import { useGetAuthToken } from './useGetAuthToken';
import {
  AuthenticationCredentials,
  useAuthApi,
  useGetUserDetails,
  useGetUserPermissions,
  useLocalStorage,
  useQueryClient,
  LanguageTypeNode,
  UserNode,
  UserStoreNodeFragment,
  useIntlUtils,
} from '@openmsupply-client/common';
import { DefinitionNode, OperationDefinitionNode } from 'graphql';

const authNameQueries = ['authToken', 'me'];
export const isAuthRequest = (definitionNode: DefinitionNode) => {
  const operationNode = definitionNode as OperationDefinitionNode;
  if (!operationNode) return false;
  if (operationNode.operation !== 'query') return false;

  return authNameQueries.indexOf(operationNode.name?.value ?? '') !== -1;
};

// mostly this is as a migration fix - previous format is a single object, not an array
export const getMostRecentCredentials = (
  mostRecentlyUsedCredentials:
    | AuthenticationCredentials
    | AuthenticationCredentials[]
    | null
) => {
  if (mostRecentlyUsedCredentials === null) return [];

  if (Array.isArray(mostRecentlyUsedCredentials))
    return mostRecentlyUsedCredentials;

  if (typeof mostRecentlyUsedCredentials === 'object')
    return [mostRecentlyUsedCredentials];

  return [];
};

// returns MRU store, if set or the first store in the list
export const getStore = async (
  userDetails?: Partial<UserNode>,
  mostRecentCredentials?: AuthenticationCredentials[]
) => {
  const defaultStore = userDetails?.defaultStore;
  const stores = userDetails?.stores?.nodes.filter(s => !s.isDisabled);
  const mru = mostRecentCredentials?.find(
    item => item.username.toLowerCase() === userDetails?.username?.toLowerCase()
  );

  if (
    mru?.store &&
    stores?.some(store => store.id === mru?.store?.id && !store.isDisabled)
  ) {
    return stores.find(store => store.id === mru.store?.id) ?? mru.store;
  }

  if (!!defaultStore && !defaultStore.isDisabled) return defaultStore;

  return !!stores && stores?.length > 0 ? stores?.[0] : undefined;
};

export const useLogin = (
  setCookie: React.Dispatch<React.SetStateAction<AuthCookie | undefined>>
) => {
  const { mutateAsync, isLoading: isLoggingIn } = useGetAuthToken();
  const { changeLanguage, getLocaleCode, getUserLocale } = useIntlUtils();
  const { mutateAsync: getUserDetails } = useGetUserDetails();
  const queryClient = useQueryClient();
  const api = useAuthApi();
  const [mostRecentlyUsedCredentials, setMRUCredentials] =
    useLocalStorage('/mru/credentials');
  const getUserPermissions = useGetUserPermissions();
  const mostRecentCredentials = getMostRecentCredentials(
    mostRecentlyUsedCredentials
  );
  const upsertMostRecentCredential = (
    username: string,
    store?: UserStoreNodeFragment
  ) => {
    const newMRU = [
      { username, store },
      ...mostRecentCredentials.filter(
        mru => mru.username.toLowerCase() !== username.toLowerCase()
      ),
    ];
    setMRUCredentials(newMRU);
  };

  const login = async (username: string, password: string) => {
    const { token, error } = await mutateAsync({ username, password });
    // The server rejects auth (NoSiteAccess, InvalidCredentials, etc.) by
    // returning an AuthTokenError with no token. Bail before any authed
    // calls — `me` with an empty Bearer header would throw
    // UnauthenticatedError and trip the global error handler.
    if (!token) return { token, error };

    const userDetails = await getUserDetails(token);
    queryClient.setQueryData(api.keys.me(token), userDetails);
    const store = await getStore(userDetails, mostRecentCredentials);
    const permissions = await getUserPermissions(token, store);

    const authCookie = {
      store,
      token,
      user: {
        id: userDetails?.userId ?? '',
        name: username,
        permissions,
        firstName: userDetails?.firstName,
        lastName: userDetails?.lastName,
        phoneNumber: userDetails?.phoneNumber,
        jobTitle: userDetails?.jobTitle,
        email: userDetails?.email,
      },
    };

    const userLocale = getUserLocale(username);
    if (userLocale === undefined) {
      changeLanguage(getLocaleCode(userDetails?.language as LanguageTypeNode));
    }
    upsertMostRecentCredential(username, store);
    setAuthCookie(authCookie);
    setCookie(authCookie);

    return { token, error };
  };

  return {
    isLoggingIn,
    login,
    upsertMostRecentCredential,
    mostRecentCredentials,
  };
};
