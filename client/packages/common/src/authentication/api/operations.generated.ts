import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type UserStoreNodeFragment = { __typename: 'UserStoreNode', code: string, id: string, nameId: string, name: string, storeMode: Types.StoreModeNodeType, createdDate?: string | null, homeCurrencyCode?: string | null, isDisabled: boolean, preferences: { __typename: 'StorePreferenceNode', id: string, responseRequisitionRequiresAuthorisation: boolean, requestRequisitionRequiresAuthorisation: boolean, packToOne: boolean, omProgramModule: boolean, vaccineModule: boolean, issueInForeignCurrency: boolean, monthlyConsumptionLookBackPeriod: number, monthsLeadTime: number, monthsOverstock: number, monthsUnderstock: number, monthsItemsExpire: number, stocktakeFrequency: number } };

export type AuthTokenQueryVariables = Types.Exact<{
  username: Types.Scalars['String']['input'];
  password: Types.Scalars['String']['input'];
}>;


export type AuthTokenQuery = { __typename: 'Queries', authToken: { __typename: 'AuthToken', token: string } | { __typename: 'AuthTokenError', error: { __typename: 'AccountBlocked', description: string, timeoutRemaining: number } | { __typename: 'CentralSyncRequired', description: string } | { __typename: 'InvalidCredentials', description: string } | { __typename: 'NoSiteAccess', description: string } } };

export type MeQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename: 'Queries', me: { __typename: 'UserNode', email?: string | null, language: Types.LanguageType, username: string, userId: string, firstName?: string | null, lastName?: string | null, phoneNumber?: string | null, jobTitle?: string | null, defaultStore?: { __typename: 'UserStoreNode', code: string, id: string, nameId: string, name: string, storeMode: Types.StoreModeNodeType, createdDate?: string | null, homeCurrencyCode?: string | null, isDisabled: boolean, preferences: { __typename: 'StorePreferenceNode', id: string, responseRequisitionRequiresAuthorisation: boolean, requestRequisitionRequiresAuthorisation: boolean, packToOne: boolean, omProgramModule: boolean, vaccineModule: boolean, issueInForeignCurrency: boolean, monthlyConsumptionLookBackPeriod: number, monthsLeadTime: number, monthsOverstock: number, monthsUnderstock: number, monthsItemsExpire: number, stocktakeFrequency: number } } | null, stores: { __typename: 'UserStoreConnector', totalCount: number, nodes: Array<{ __typename: 'UserStoreNode', code: string, id: string, nameId: string, name: string, storeMode: Types.StoreModeNodeType, createdDate?: string | null, homeCurrencyCode?: string | null, isDisabled: boolean, preferences: { __typename: 'StorePreferenceNode', id: string, responseRequisitionRequiresAuthorisation: boolean, requestRequisitionRequiresAuthorisation: boolean, packToOne: boolean, omProgramModule: boolean, vaccineModule: boolean, issueInForeignCurrency: boolean, monthlyConsumptionLookBackPeriod: number, monthsLeadTime: number, monthsOverstock: number, monthsUnderstock: number, monthsItemsExpire: number, stocktakeFrequency: number } }> } } };

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
    monthlyConsumptionLookBackPeriod
    monthsLeadTime
    monthsOverstock
    monthsUnderstock
    monthsItemsExpire
    stocktakeFrequency
  }
  createdDate
  homeCurrencyCode
  isDisabled
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
        ... on CentralSyncRequired {
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    authToken(variables: AuthTokenQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AuthTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AuthTokenQuery>(AuthTokenDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'authToken', 'query', variables);
    },
    me(variables?: MeQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<MeQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MeQuery>(MeDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'me', 'query', variables);
    },
    isCentralServer(variables?: IsCentralServerQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<IsCentralServerQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<IsCentralServerQuery>(IsCentralServerDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'isCentralServer', 'query', variables);
    },
    refreshToken(variables?: RefreshTokenQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<RefreshTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RefreshTokenQuery>(RefreshTokenDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'refreshToken', 'query', variables);
    },
    permissions(variables: PermissionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PermissionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PermissionsQuery>(PermissionsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'permissions', 'query', variables);
    },
    storePreferences(variables: StorePreferencesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<StorePreferencesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StorePreferencesQuery>(StorePreferencesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'storePreferences', 'query', variables);
    },
    updateUser(variables?: UpdateUserMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateUserMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateUserMutation>(UpdateUserDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateUser', 'mutation', variables);
    },
    lastSuccessfulUserSync(variables?: LastSuccessfulUserSyncQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LastSuccessfulUserSyncQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LastSuccessfulUserSyncQuery>(LastSuccessfulUserSyncDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'lastSuccessfulUserSync', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;