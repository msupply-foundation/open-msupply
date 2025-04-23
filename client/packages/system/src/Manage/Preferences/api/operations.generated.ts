import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PreferenceDescriptionsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
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

export type UpsertPreferenceMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpsertPreferenceInput;
}>;

export type UpsertPreferenceMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    preferences: {
      __typename: 'PreferenceMutations';
      upsertPreference: { __typename: 'IdResponse'; id: string };
    };
  };
};

export const PreferenceDescriptionsDocument = gql`
  query preferenceDescriptions($storeId: String!) {
    preferenceDescriptions(storeId: $storeId) {
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
export const UpsertPreferenceDocument = gql`
  mutation upsertPreference($storeId: String!, $input: UpsertPreferenceInput!) {
    centralServer {
      preferences {
        upsertPreference(storeId: $storeId, input: $input) {
          id
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
    upsertPreference(
      variables: UpsertPreferenceMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpsertPreferenceMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertPreferenceMutation>(
            UpsertPreferenceDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'upsertPreference',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
