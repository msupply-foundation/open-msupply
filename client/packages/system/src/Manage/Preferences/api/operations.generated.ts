import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type AllPrefsQueryVariables = Types.Exact<{ [key: string]: never }>;

export type AllPrefsQuery = {
  __typename: 'Queries';
  availablePreferences: Array<{
    __typename: 'PreferenceDescriptionNode';
    key: string;
    jsonSchema: any;
    uiSchema: any;
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
      upsertPreference: { __typename: 'PreferenceNode'; id: string };
    };
  };
};

export const AllPrefsDocument = gql`
  query allPrefs {
    availablePreferences {
      key
      jsonSchema
      uiSchema
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
    allPrefs(
      variables?: AllPrefsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<AllPrefsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<AllPrefsQuery>(AllPrefsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'allPrefs',
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
