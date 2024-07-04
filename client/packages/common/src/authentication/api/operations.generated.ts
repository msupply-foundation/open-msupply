import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type UserStoreNodeFragment = { __typename: 'UserStoreNode', code: string, id: string, nameId: string, name: string, storeMode: Types.StoreModeNodeType, createdDate?: string | null, homeCurrencyCode?: string | null, preferences: { __typename: 'StorePreferenceNode', id: string, responseRequisitionRequiresAuthorisation: boolean, requestRequisitionRequiresAuthorisation: boolean, packToOne: boolean, omProgramModule: boolean, vaccineModule: boolean, issueInForeignCurrency: boolean } };

export type AuthTokenQueryVariables = Types.Exact<{
  username: Types.Scalars['String']['input'];
  password: Types.Scalars['String']['input'];
}>;


export type AuthTokenQuery = { __typename: 'Queries', authToken: { __typename: 'AuthToken', token: string } | { __typename: 'AuthTokenError', error: { __typename: 'AccountBlocked', description: string, timeoutRemaining: number } | { __typename: 'InvalidCredentials', description: string } | { __typename: 'NoSiteAccess', description: string } } };

export type MeQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename: 'Queries', me: { __typename: 'UserNode', email?: string | null, language: Types.LanguageType, username: string, userId: string, firstName?: string | null, lastName?: string | null, phoneNumber?: string | null, jobTitle?: string | null, defaultStore?: { __typename: 'UserStoreNode', code: string, id: string, nameId: string, name: string, storeMode: Types.StoreModeNodeType, createdDate?: string | null, homeCurrencyCode?: string | null, preferences: { __typename: 'StorePreferenceNode', id: string, responseRequisitionRequiresAuthorisation: boolean, requestRequisitionRequiresAuthorisation: boolean, packToOne: boolean, omProgramModule: boolean, vaccineModule: boolean, issueInForeignCurrency: boolean } } | null, stores: { __typename: 'UserStoreConnector', totalCount: number, nodes: Array<{ __typename: 'UserStoreNode', code: string, id: string, nameId: string, name: string, storeMode: Types.StoreModeNodeType, createdDate?: string | null, homeCurrencyCode?: string | null, preferences: { __typename: 'StorePreferenceNode', id: string, responseRequisitionRequiresAuthorisation: boolean, requestRequisitionRequiresAuthorisation: boolean, packToOne: boolean, omProgramModule: boolean, vaccineModule: boolean, issueInForeignCurrency: boolean } }> } } };

export type IsCentralServerQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type IsCentralServerQuery = { __typename: 'Queries', isCentralServer: boolean };

export type RefreshTokenQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type RefreshTokenQuery = { __typename: 'Queries', refreshToken: { __typename: 'RefreshToken', token: string } | { __typename: 'RefreshTokenError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'InvalidToken', description: string } | { __typename: 'NoRefreshTokenProvided', description: string } | { __typename: 'NotARefreshToken', description: string } | { __typename: 'TokenExpired', description: string } } };

export type PermissionsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;


export type PermissionsQuery = { __typename: 'Queries', me: { __typename: 'UserNode', username: string, permissions: { __typename: 'UserStorePermissionConnector', totalCount: number, nodes: Array<{ __typename: 'UserStorePermissionNode', permissions: Array<Types.UserPermission>, storeId: string }> } } };

export type StorePreferencesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;


export type StorePreferencesQuery = { __typename: 'Queries', storePreferences: { __typename: 'StorePreferenceNode', responseRequisitionRequiresAuthorisation: boolean, requestRequisitionRequiresAuthorisation: boolean, packToOne: boolean, id: string } };

export type UpdateUserFragment = { __typename: 'UpdateUserNode', lastSuccessfulSync?: string | null };

export type UpdateUserMutationVariables = Types.Exact<{ [key: string]: never; }>;


export type UpdateUserMutation = { __typename: 'Mutations', updateUser: { __typename: 'UpdateUserError', error: { __typename: 'ConnectionError', description: string } | { __typename: 'InvalidCredentials', description: string } | { __typename: 'MissingCredentials', description: string } } | { __typename: 'UpdateUserNode', lastSuccessfulSync?: string | null } };

export type LastSuccessfulUserSyncQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type LastSuccessfulUserSyncQuery = { __typename: 'Queries', lastSuccessfulUserSync: { __typename: 'UpdateUserNode', lastSuccessfulSync?: string | null } };

export const UserStoreNodeFragmentDoc = gql`
    fragment UserStoreNode on UserStoreNode {
  code
  id
  nameId
  name
  storeMode
  preferences {
    id
    responseRequisitionRequiresAuthorisation
    requestRequisitionRequiresAuthorisation
    packToOne
    omProgramModule
    vaccineModule
    issueInForeignCurrency
  }
  createdDate
  homeCurrencyCode
}
    `;
export const UpdateUserFragmentDoc = gql`
    fragment UpdateUser on UpdateUserNode {
  lastSuccessfulSync
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
        ... on NoSiteAccess {
          __typename
          description
        }
        ... on AccountBlocked {
          __typename
          description
          timeoutRemaining
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
      language
      stores {
        totalCount
        nodes {
          __typename
          ...UserStoreNode
        }
      }
      username
      userId
      firstName
      lastName
      phoneNumber
      jobTitle
    }
  }
}
    ${UserStoreNodeFragmentDoc}`;
export const IsCentralServerDocument = gql`
    query isCentralServer {
  isCentralServer
}
    `;
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
export const PermissionsDocument = gql`
    query permissions($storeId: String!) {
  me {
    ... on UserNode {
      __typename
      username
      permissions(storeId: $storeId) {
        nodes {
          permissions
          storeId
        }
        totalCount
      }
    }
  }
}
    `;
export const StorePreferencesDocument = gql`
    query storePreferences($storeId: String!) {
  storePreferences(storeId: $storeId) {
    responseRequisitionRequiresAuthorisation
    requestRequisitionRequiresAuthorisation
    packToOne
    id
  }
}
    `;
export const UpdateUserDocument = gql`
    mutation updateUser {
  updateUser {
    __typename
    ... on UpdateUserNode {
      ...UpdateUser
    }
    ... on UpdateUserError {
      __typename
      error {
        ... on InvalidCredentials {
          __typename
          description
        }
        ... on ConnectionError {
          __typename
          description
        }
        ... on MissingCredentials {
          __typename
          description
        }
        description
      }
    }
  }
}
    ${UpdateUserFragmentDoc}`;
export const LastSuccessfulUserSyncDocument = gql`
    query lastSuccessfulUserSync {
  lastSuccessfulUserSync {
    __typename
    ...UpdateUser
  }
}
    ${UpdateUserFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    authToken(variables: AuthTokenQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AuthTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AuthTokenQuery>(AuthTokenDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'authToken', 'query');
    },
    me(variables?: MeQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<MeQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MeQuery>(MeDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'me', 'query');
    },
    isCentralServer(variables?: IsCentralServerQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<IsCentralServerQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<IsCentralServerQuery>(IsCentralServerDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'isCentralServer', 'query');
    },
    refreshToken(variables?: RefreshTokenQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<RefreshTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RefreshTokenQuery>(RefreshTokenDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'refreshToken', 'query');
    },
    permissions(variables: PermissionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PermissionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PermissionsQuery>(PermissionsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'permissions', 'query');
    },
    storePreferences(variables: StorePreferencesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<StorePreferencesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StorePreferencesQuery>(StorePreferencesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'storePreferences', 'query');
    },
    updateUser(variables?: UpdateUserMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateUserMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateUserMutation>(UpdateUserDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateUser', 'mutation');
    },
    lastSuccessfulUserSync(variables?: LastSuccessfulUserSyncQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LastSuccessfulUserSyncQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LastSuccessfulUserSyncQuery>(LastSuccessfulUserSyncDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'lastSuccessfulUserSync', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;