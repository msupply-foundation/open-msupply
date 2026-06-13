import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type StoreFragment = {
  __typename: 'UserStoreNode';
  id: string;
  code: string;
  name: string;
  storeMode: Types.StoreModeNodeType;
};

export type AuthTokenQueryVariables = Types.Exact<{
  username: Types.Scalars['String']['input'];
  password: Types.Scalars['String']['input'];
}>;

export type AuthTokenQuery = {
  __typename: 'Queries';
  authToken:
    | { __typename: 'AuthToken'; token: string }
    | {
        __typename: 'AuthTokenError';
        error:
          | { __typename: 'AccountBlocked'; description: string }
          | { __typename: 'CentralSyncRequired'; description: string }
          | { __typename: 'InvalidCredentials'; description: string }
          | { __typename: 'NoSiteAccess'; description: string };
      };
};

export type MeQueryVariables = Types.Exact<{ [key: string]: never }>;

export type MeQuery = {
  __typename: 'Queries';
  me: {
    __typename: 'UserNode';
    userId: string;
    username: string;
    email?: string | null;
    defaultStore?: {
      __typename: 'UserStoreNode';
      id: string;
      code: string;
      name: string;
      storeMode: Types.StoreModeNodeType;
    } | null;
    stores: {
      __typename: 'UserStoreConnector';
      totalCount: number;
      nodes: Array<{
        __typename: 'UserStoreNode';
        id: string;
        code: string;
        name: string;
        storeMode: Types.StoreModeNodeType;
      }>;
    };
  };
};

export type PermissionsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type PermissionsQuery = {
  __typename: 'Queries';
  me: {
    __typename: 'UserNode';
    permissions: {
      __typename: 'UserStorePermissionConnector';
      nodes: Array<{
        __typename: 'UserStorePermissionNode';
        permissions: Array<Types.UserPermission>;
        storeId: string;
      }>;
    };
  };
};

export type RefreshTokenQueryVariables = Types.Exact<{ [key: string]: never }>;

export type RefreshTokenQuery = {
  __typename: 'Queries';
  refreshToken:
    | { __typename: 'RefreshToken'; token: string }
    | { __typename: 'RefreshTokenError' };
};

export const StoreFragmentDoc = gql`
  fragment Store on UserStoreNode {
    __typename
    id
    code
    name
    storeMode
  }
`;
export const AuthTokenDocument = gql`
  query authToken($username: String!, $password: String!) {
    authToken(username: $username, password: $password) {
      __typename
      ... on AuthToken {
        token
      }
      ... on AuthTokenError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const MeDocument = gql`
  query me {
    me {
      ... on UserNode {
        __typename
        userId
        username
        email
        defaultStore {
          ...Store
        }
        stores {
          totalCount
          nodes {
            ...Store
          }
        }
      }
    }
  }
  ${StoreFragmentDoc}
`;
export const PermissionsDocument = gql`
  query permissions($storeId: String!) {
    me {
      ... on UserNode {
        __typename
        permissions(storeId: $storeId) {
          nodes {
            permissions
            storeId
          }
        }
      }
    }
  }
`;
export const RefreshTokenDocument = gql`
  query refreshToken {
    refreshToken {
      __typename
      ... on RefreshToken {
        token
      }
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables,
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper,
) {
  return {
    authToken(
      variables: AuthTokenQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<AuthTokenQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<AuthTokenQuery>({
            document: AuthTokenDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'authToken',
        'query',
        variables,
      );
    },
    me(
      variables?: MeQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<MeQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<MeQuery>({
            document: MeDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'me',
        'query',
        variables,
      );
    },
    permissions(
      variables: PermissionsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<PermissionsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PermissionsQuery>({
            document: PermissionsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'permissions',
        'query',
        variables,
      );
    },
    refreshToken(
      variables?: RefreshTokenQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<RefreshTokenQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RefreshTokenQuery>({
            document: RefreshTokenDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'refreshToken',
        'query',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
