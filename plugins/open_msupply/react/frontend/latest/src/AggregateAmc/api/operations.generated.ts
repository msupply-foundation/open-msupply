import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PluginDataQueryVariables = Types.Exact<{
  pluginCode: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
  requisitionLineIds?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
  dataIdentifier: Types.Scalars['String']['input'];
}>;


export type PluginDataQuery = { __typename: 'Queries', pluginData: { __typename: 'PluginDataConnector', nodes: Array<{ __typename: 'PluginDataNode', id: string, data: string, relatedRecordId?: string | null }> } };


export const PluginDataDocument = gql`
    query pluginData($pluginCode: String!, $storeId: String!, $requisitionLineIds: [String!], $dataIdentifier: String!) {
  pluginData(
    pluginCode: $pluginCode
    storeId: $storeId
    filter: {dataIdentifier: {equalTo: $dataIdentifier}, relatedRecordId: {equalAny: $requisitionLineIds}}
  ) {
    __typename
    ... on PluginDataConnector {
      nodes {
        id
        data
        relatedRecordId
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    pluginData(variables: PluginDataQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PluginDataQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PluginDataQuery>(PluginDataDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'pluginData', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;