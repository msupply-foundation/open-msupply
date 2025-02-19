import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type FrontendPluginMetadataQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type FrontendPluginMetadataQuery = { __typename: 'Queries', frontendPluginMetadata: Array<{ __typename: 'FrontendPluginMetadataNode', code: string, path: string }> };


export const FrontendPluginMetadataDocument = gql`
    query frontendPluginMetadata {
  frontendPluginMetadata {
    code
    path
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    frontendPluginMetadata(variables?: FrontendPluginMetadataQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<FrontendPluginMetadataQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<FrontendPluginMetadataQuery>(FrontendPluginMetadataDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'frontendPluginMetadata', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;