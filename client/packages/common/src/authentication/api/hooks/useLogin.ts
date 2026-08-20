import { AuthError, AuthState, setAuthState } from '../../AuthContext';
import { AuthenticationError } from '../api';
import { useGetAuthToken } from './useGetAuthToken';
import {
  AuthenticationCredentials,
  LocalStorage,
  useAuthApi,
  useGetUserDetails,
  useGetUserPermissions,
  useGql,
  useLocalStorage,
  useQueryClient,
  LanguageTypeNode,
  UserNode,
  UserStoreNodeFragment,
  useIntlUtils,
} from '@openmsupply-client/common';
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

  switch (LocalStorage.getItem('/error/auth')) {
    case AuthError.NoStoreAssigned:
    case AuthError.Unauthenticated:
    case AuthError.Timeout:
    case AuthError.ServerError:
      return true;
    default:
      return false;
  }
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

export const useLogin = () => {
  const { mutateAsync, isPending: isLoggingIn } = useGetAuthToken();
  const { changeLanguage, getLocaleCode, getUserLocale } = useIntlUtils();
  const { setSkipRequest } = useGql();
  const { mutateAsync: getUserDetails } = useGetUserDetails();
  const queryClient = useQueryClient();
  const api = useAuthApi();
  const [mostRecentlyUsedCredentials, setMRUCredentials] =
    useLocalStorage('/mru/credentials');
  const getUserPermissions = useGetUserPermissions();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_error, setError, removeError] = useLocalStorage('/error/auth');
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

  const setLoginError = (isLoggedIn: boolean, hasValidStore: boolean) => {
    if (LocalStorage.getItem('/error/auth') === AuthError.ServerError) return;

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

  /**
   * Everything after the session cookie exists: load the user, choose a store, cache permissions
   * and persist the local auth state.
   *
   * Shared by the password login and the single sign-on return, which differ only in *how* the
   * cookie was obtained — with SSO the server has already set it by the time the browser gets
   * back here, so there is no token step to perform.
   *
   * `knownUsername` is the name the user typed; for SSO it comes from the session instead.
   * `assumeLoggedIn` is the password login's token check; SSO relies on `me` answering at all.
   */
  const establishSession = async (
    knownUsername?: string,
    assumeLoggedIn?: boolean
  ): Promise<{
    success: boolean;
    username: string;
    error?: AuthenticationError;
  }> => {
    let userDetails;
    try {
      userDetails = await getUserDetails();
    } catch (e) {
      return {
        success: false,
        username: knownUsername ?? '',
        error: {
          message: 'ConnectionError',
          detail: (e as Error)?.message,
        },
      };
    }
    const username = knownUsername ?? userDetails?.username ?? '';
    const isLoggedIn = assumeLoggedIn ?? !!userDetails?.userId;
    queryClient.setQueryData(api.keys.me(), userDetails);
    const store = await getStore(userDetails, mostRecentCredentials);
    const permissions = await getUserPermissions(store);
    setSkipRequest(skipNoStoreRequests);

    const next: AuthState = {
      isAuthenticated: isLoggedIn,
      store,
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

    if (isLoggedIn) {
      const userLocale = getUserLocale(username);
      if (userLocale === undefined) {
        changeLanguage(
          getLocaleCode(userDetails?.language as LanguageTypeNode)
        );
      }
      upsertMostRecentCredential(username, store);
      setAuthState(next);
    }
    setLoginError(isLoggedIn, !!store);
    setSkipRequest(
      () => LocalStorage.getItem('/error/auth') === AuthError.NoStoreAssigned
    );

    return { success: isLoggedIn, username, error: undefined };
  };

  const login = async (username: string, password: string) => {
    // The session cookie is set by the server in the `Set-Cookie` response header — JS never
    // touches the token. We only use the response's `token` field as a "did login succeed?"
    // signal for legacy reasons.
    const { token, error } = await mutateAsync({ username, password });
    if (!token) return { token, error };

    const session = await establishSession(username, true);
    return { token: session.success ? token : '', error: session.error };
  };

  /**
   * Adopt a session the server created during single sign-on. The cookie is already set, so only
   * the client-side state is missing; the username comes from the session rather than a form.
   */
  const completeSsoLogin = () => establishSession();

  return {
    isLoggingIn,
    login,
    completeSsoLogin,
    upsertMostRecentCredential,
    mostRecentCredentials,
  };
};
