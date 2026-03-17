import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type FrontendPluginMetadataQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type FrontendPluginMetadataQuery = {
  __typename: 'Queries';
  frontendPluginMetadata: Array<{
    __typename: 'FrontendPluginMetadataNode';
    code: string;
    path: string;
  }>;
};

export type PluginGraphqlQueryQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.Scalars['JSON']['input'];
  pluginCode: Types.Scalars['String']['input'];
}>;

export type PluginGraphqlQueryQuery = {
  __typename: 'Queries';
  pluginGraphqlQuery: any;
};

export const FrontendPluginMetadataDocument = gql`
  query frontendPluginMetadata {
    frontendPluginMetadata {
      code
      path
    }
  }
`;
export const PluginGraphqlQueryDocument = gql`
  query pluginGraphqlQuery(
    $storeId: String!
    $input: JSON!
    $pluginCode: String!
  ) {
    pluginGraphqlQuery(
      input: $input
      pluginCode: $pluginCode
      storeId: $storeId
    )
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
    frontendPluginMetadata(
      variables?: FrontendPluginMetadataQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<FrontendPluginMetadataQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<FrontendPluginMetadataQuery>({
            document: FrontendPluginMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'frontendPluginMetadata',
        'query',
        variables
      );
    },
    pluginGraphqlQuery(
      variables: PluginGraphqlQueryQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PluginGraphqlQueryQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PluginGraphqlQueryQuery>({
            document: PluginGraphqlQueryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'pluginGraphqlQuery',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
