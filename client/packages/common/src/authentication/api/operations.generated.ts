import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type UserStoreNodeFragment = { __typename: 'UserStoreNode', code: string, id: string, name: string };

export type AuthTokenQueryVariables = Types.Exact<{
  username: Types.Scalars['String'];
  password: Types.Scalars['String'];
}>;


export type AuthTokenQuery = { __typename: 'FullQuery', authToken: { __typename: 'AuthToken', token: string } | { __typename: 'AuthTokenError', error: { __typename: 'InvalidCredentials', description: string } } };

export type MeQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename: 'FullQuery', me: { __typename: 'UserNode', email?: string | null, username: string, userId: string, defaultStore?: { __typename: 'UserStoreNode', code: string, id: string, name: string } | null, stores: { __typename: 'UserStoreConnector', totalCount: number, nodes: Array<{ __typename: 'UserStoreNode', code: string, id: string, name: string }> } } };

export type RefreshTokenQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type RefreshTokenQuery = { __typename: 'FullQuery', refreshToken: { __typename: 'RefreshToken', token: string } | { __typename: 'RefreshTokenError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'InvalidToken', description: string } | { __typename: 'NoRefreshTokenProvided', description: string } | { __typename: 'NotARefreshToken', description: string } | { __typename: 'TokenExpired', description: string } } };

export const UserStoreNodeFragmentDoc = gql`
    fragment UserStoreNode on UserStoreNode {
  code
  id
  name
}
    `;
export const AuthTokenDocument = gql`
    query authToken($username: String!, $password: String!) {
  authToken(password: $password, username: $username) {
    ... on AuthTokenError {
      __typename
      error {
        ... on InvalidCredentials {
          __typename
          description
        }
        description
      }
    }
    ... on AuthToken {
      __typename
      token
    }
  }
}
    `;
export const MeDocument = gql`
    query me {
  me {
    ... on UserNode {
      __typename
      email
      defaultStore {
        ...UserStoreNode
      }
      stores {
        totalCount
        nodes {
          __typename
          ...UserStoreNode
        }
      }
      username
      userId
    }
  }
}
    ${UserStoreNodeFragmentDoc}`;
export const RefreshTokenDocument = gql`
    query refreshToken {
  refreshToken {
    ... on RefreshToken {
      __typename
      token
    }
    ... on RefreshTokenError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on TokenExpired {
          __typename
          description
        }
        ... on NotARefreshToken {
          __typename
          description
        }
        ... on NoRefreshTokenProvided {
          __typename
          description
        }
        ... on InvalidToken {
          __typename
          description
        }
        ... on InternalError {
          __typename
          description
          fullError
        }
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    authToken(variables: AuthTokenQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<AuthTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AuthTokenQuery>(AuthTokenDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'authToken', 'query');
    },
    me(variables?: MeQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<MeQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MeQuery>(MeDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'me', 'query');
    },
    refreshToken(variables?: RefreshTokenQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<RefreshTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RefreshTokenQuery>(RefreshTokenDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'refreshToken', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAuthTokenQuery((req, res, ctx) => {
 *   const { username, password } = req.variables;
 *   return res(
 *     ctx.data({ authToken })
 *   )
 * })
 */
export const mockAuthTokenQuery = (resolver: ResponseResolver<GraphQLRequest<AuthTokenQueryVariables>, GraphQLContext<AuthTokenQuery>, any>) =>
  graphql.query<AuthTokenQuery, AuthTokenQueryVariables>(
    'authToken',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockMeQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ me })
 *   )
 * })
 */
export const mockMeQuery = (resolver: ResponseResolver<GraphQLRequest<MeQueryVariables>, GraphQLContext<MeQuery>, any>) =>
  graphql.query<MeQuery, MeQueryVariables>(
    'me',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockRefreshTokenQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ refreshToken })
 *   )
 * })
 */
export const mockRefreshTokenQuery = (resolver: ResponseResolver<GraphQLRequest<RefreshTokenQueryVariables>, GraphQLContext<RefreshTokenQuery>, any>) =>
  graphql.query<RefreshTokenQuery, RefreshTokenQueryVariables>(
    'refreshToken',
    resolver
  )
