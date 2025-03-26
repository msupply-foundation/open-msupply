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
    globalOnly: boolean;
    jsonFormsInputType: string;
    serialisedDefault: string;
  }>;
};

export type PrefsByKeyQueryVariables = Types.Exact<{
  key: Types.Scalars['String']['input'];
}>;

export type PrefsByKeyQuery = {
  __typename: 'Queries';
  centralServer: {
    __typename: 'CentralServerQueryNode';
    preferences: {
      __typename: 'CentralPreferenceQueries';
      preferencesByKey: {
        __typename: 'PreferencesByKeyNode';
        global?: {
          __typename: 'PreferenceNode';
          id: string;
          key: string;
          value: string;
        } | null;
        perStore: Array<{
          __typename: 'PreferenceNode';
          id: string;
          key: string;
          value: string;
          storeId?: string | null;
        }>;
      };
    };
  };
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
  query AllPrefs {
    availablePreferences {
      key
      globalOnly
      jsonFormsInputType
      serialisedDefault
    }
  }
`;
export const PrefsByKeyDocument = gql`
  query prefsByKey($key: String!) {
    centralServer {
      preferences {
        preferencesByKey(key: $key) {
          global {
            id
            key
            value
          }
          perStore {
            id
            key
            value
            storeId
          }
        }
      }
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
    AllPrefs(
      variables?: AllPrefsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<AllPrefsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<AllPrefsQuery>(AllPrefsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'AllPrefs',
        'query',
        variables
      );
    },
    prefsByKey(
      variables: PrefsByKeyQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PrefsByKeyQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PrefsByKeyQuery>(PrefsByKeyDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'prefsByKey',
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
