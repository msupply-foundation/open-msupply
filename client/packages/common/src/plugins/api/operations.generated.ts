import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PluginsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type PluginsQuery = { __typename: 'Queries', plugins: Array<{ __typename: 'PluginNode', config: string, name: string, path: string }> };


export const PluginsDocument = gql`
    query plugins {
  plugins {
    config
    name
    path
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    plugins(variables?: PluginsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PluginsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PluginsQuery>(PluginsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'plugins', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;