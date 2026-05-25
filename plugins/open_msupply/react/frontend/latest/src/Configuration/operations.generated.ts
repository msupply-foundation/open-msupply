import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ExamplePluginConfigurationQueryVariables = Types.Exact<{
  pluginCode: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type ExamplePluginConfigurationQuery = {
  __typename: 'Queries';
  pluginData: {
    __typename: 'PluginDataConnector';
    nodes: Array<{
      __typename: 'PluginDataNode';
      id: string;
      data: string;
      storeId?: string | null;
    }>;
  };
};

export const ExamplePluginConfigurationDocument = gql`
  query examplePluginConfiguration($pluginCode: String!, $storeId: String!) {
    pluginData(
      pluginCode: $pluginCode
      storeId: $storeId
      filter: { dataIdentifier: { equalTo: "configuration" } }
    ) {
      __typename
      ... on PluginDataConnector {
        nodes {
          id
          data
          storeId
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
    examplePluginConfiguration(
      variables: ExamplePluginConfigurationQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ExamplePluginConfigurationQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ExamplePluginConfigurationQuery>({
            document: ExamplePluginConfigurationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'examplePluginConfiguration',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
