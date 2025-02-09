import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PluginDataQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  stockLineIds?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
}>;


export type PluginDataQuery = { __typename: 'Queries', pluginData: { __typename: 'PluginDataConnector', nodes: Array<{ __typename: 'PluginDataNode', id: string, data: string, pluginCode: string, relatedRecordId: string }> } };

export type InsertPluginDataMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertPluginDataInput;
}>;


export type InsertPluginDataMutation = { __typename: 'Mutations', insertPluginData: { __typename: 'PluginDataNode', id: string } };

export type UpdatePluginDataMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdatePluginDataInput;
}>;


export type UpdatePluginDataMutation = { __typename: 'Mutations', updatePluginData: { __typename: 'PluginDataNode', id: string } };


export const PluginDataDocument = gql`
    query pluginData($storeId: String!, $stockLineIds: [String!]) {
  pluginData(
    storeId: $storeId
    type: STOCK_LINE
    filter: {relatedRecordId: {equalAny: $stockLineIds}}
  ) {
    ... on PluginDataConnector {
      __typename
      nodes {
        __typename
        id
        data
        pluginCode
        relatedRecordId
      }
    }
  }
}
    `;
export const InsertPluginDataDocument = gql`
    mutation insertPluginData($storeId: String!, $input: InsertPluginDataInput!) {
  insertPluginData(input: $input, storeId: $storeId) {
    ... on PluginDataNode {
      __typename
      id
    }
  }
}
    `;
export const UpdatePluginDataDocument = gql`
    mutation updatePluginData($storeId: String!, $input: UpdatePluginDataInput!) {
  updatePluginData(input: $input, storeId: $storeId) {
    ... on PluginDataNode {
      __typename
      id
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
    },
    insertPluginData(variables: InsertPluginDataMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertPluginDataMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertPluginDataMutation>(InsertPluginDataDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertPluginData', 'mutation', variables);
    },
    updatePluginData(variables: UpdatePluginDataMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdatePluginDataMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdatePluginDataMutation>(UpdatePluginDataDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updatePluginData', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;