import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type AdminPreferenceFragment = {
  __typename: 'PreferenceDescriptionNode';
  key: Types.PreferenceKey;
  valueType: Types.PreferenceValueNodeType;
  value: any;
};

export type AdminPreferenceListQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  prefType: Types.PreferenceNodeType;
  prefContext: Types.PreferenceDescriptionContext;
}>;

export type AdminPreferenceListQuery = {
  __typename: 'Queries';
  preferenceDescriptions: Array<{
    __typename: 'PreferenceDescriptionNode';
    key: Types.PreferenceKey;
    valueType: Types.PreferenceValueNodeType;
    value: any;
  }>;
};

export type UpsertPreferencesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpsertPreferencesInput;
}>;

export type UpsertPreferencesMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    preferences: {
      __typename: 'PreferenceMutations';
      upsertPreferences: { __typename: 'OkResponse'; ok: boolean };
    };
  };
};

export const AdminPreferenceFragmentDoc = gql`
  fragment AdminPreference on PreferenceDescriptionNode {
    key
    valueType
    value
  }
`;
export const AdminPreferenceListDocument = gql`
  query adminPreferenceList(
    $storeId: String!
    $prefType: PreferenceNodeType!
    $prefContext: PreferenceDescriptionContext!
  ) {
    preferenceDescriptions(
      storeId: $storeId
      prefType: $prefType
      prefContext: $prefContext
    ) {
      ...AdminPreference
    }
  }
  ${AdminPreferenceFragmentDoc}
`;
export const UpsertPreferencesDocument = gql`
  mutation upsertPreferences(
    $storeId: String!
    $input: UpsertPreferencesInput!
  ) {
    centralServer {
      preferences {
        upsertPreferences(storeId: $storeId, input: $input) {
          ok
        }
      }
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    adminPreferenceList(
      variables: AdminPreferenceListQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<AdminPreferenceListQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<AdminPreferenceListQuery>(
            AdminPreferenceListDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'adminPreferenceList',
        'query',
        variables
      );
    },
    upsertPreferences(
      variables: UpsertPreferencesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpsertPreferencesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertPreferencesMutation>(
            UpsertPreferencesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'upsertPreferences',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
