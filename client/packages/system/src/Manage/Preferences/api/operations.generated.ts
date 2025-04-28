import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PreferenceDescriptionsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  prefType: Types.PreferenceNodeType;
}>;

export type PreferenceDescriptionsQuery = {
  __typename: 'Queries';
  preferenceDescriptions: Array<{
    __typename: 'PreferenceDescriptionNode';
    key: string;
    valueType: Types.PreferenceValueNodeType;
  }>;
};

export type PreferencesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type PreferencesQuery = {
  __typename: 'Queries';
  preferences: { __typename: 'PreferencesNode'; showContactTracing: boolean };
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

export const PreferenceDescriptionsDocument = gql`
  query preferenceDescriptions(
    $storeId: String!
    $prefType: PreferenceNodeType!
  ) {
    preferenceDescriptions(storeId: $storeId, prefType: $prefType) {
      key
      valueType
    }
  }
`;
export const PreferencesDocument = gql`
  query preferences($storeId: String!) {
    preferences(storeId: $storeId) {
      showContactTracing
    }
  }
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
    preferenceDescriptions(
      variables: PreferenceDescriptionsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PreferenceDescriptionsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PreferenceDescriptionsQuery>(
            PreferenceDescriptionsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'preferenceDescriptions',
        'query',
        variables
      );
    },
    preferences(
      variables: PreferencesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PreferencesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PreferencesQuery>(PreferencesDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'preferences',
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
