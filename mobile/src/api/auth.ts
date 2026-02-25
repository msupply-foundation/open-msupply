import {gql} from '@apollo/client';
import {apolloClient} from './apolloClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserStore {
  id: string;
  code: string;
  name: string;
}

export interface AuthTokenSuccess {
  __typename: 'AuthToken';
  token: string;
}

export interface AuthTokenError {
  __typename: 'AuthTokenError';
  error: {
    __typename: string;
    description: string;
    timeoutRemaining?: number;
  };
}

export interface MeUser {
  userId: string;
  username: string;
  defaultStore: UserStore | null;
  stores: {
    nodes: UserStore[];
  };
}

// ─── Queries / Mutations ─────────────────────────────────────────────────────

const AUTH_TOKEN = gql`
  query authToken($username: String!, $password: String!) {
    authToken(password: $password, username: $username) {
      ... on AuthTokenError {
        __typename
        error {
          __typename
          description
          ... on AccountBlocked {
            timeoutRemaining
          }
        }
      }
      ... on AuthToken {
        __typename
        token
      }
    }
  }
`;

const ME = gql`
  query me {
    me {
      ... on UserNode {
        userId
        username
        defaultStore {
          id
          code
          name
        }
        stores {
          nodes {
            id
            code
            name
          }
        }
      }
    }
  }
`;

// ─── API functions ────────────────────────────────────────────────────────────

export async function login(
  username: string,
  password: string,
): Promise<AuthTokenSuccess | AuthTokenError> {
  const {data} = await apolloClient.query<{
    authToken: AuthTokenSuccess | AuthTokenError;
  }>({
    query: AUTH_TOKEN,
    variables: {username, password},
    fetchPolicy: 'network-only',
  });
  return data.authToken;
}

export async function fetchCurrentUser(): Promise<MeUser | null> {
  const {data} = await apolloClient.query<{me: {__typename: string} & MeUser}>(
    {
      query: ME,
      fetchPolicy: 'network-only',
    },
  );
  if (data.me.__typename === 'UserNode') {
    return data.me as MeUser;
  }
  return null;
}
