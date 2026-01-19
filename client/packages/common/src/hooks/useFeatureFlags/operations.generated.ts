import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type FeatureFlagsQueryVariables = Types.Exact<{ [key: string]: never }>;

export type FeatureFlagsQuery = { __typename: 'Queries'; featureFlags: any };

export const FeatureFlagsDocument = gql`
  query featureFlags {
    featureFlags
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
    featureFlags(
      variables?: FeatureFlagsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<FeatureFlagsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<FeatureFlagsQuery>({
            document: FeatureFlagsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'featureFlags',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
