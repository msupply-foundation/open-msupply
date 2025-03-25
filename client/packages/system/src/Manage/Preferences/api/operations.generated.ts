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
  }>;
};

export const AllPrefsDocument = gql`
  query AllPrefs {
    availablePreferences {
      key
      globalOnly
      jsonFormsInputType
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
  };
}
export type Sdk = ReturnType<typeof getSdk>;
