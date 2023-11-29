import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type PluginDataQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  stockLineId: Types.Scalars['String']['input'];
}>;


export type PluginDataQuery = { __typename: 'Queries', pluginData: { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'PluginDataNode', id: string, data: string, pluginName: string } };

export type InsertPluginDataMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertPluginDataInput;
}>;


export type InsertPluginDataMutation = { __typename: 'Mutations', insertPluginData: { __typename: 'PluginDataNode', id: string } };

export type UpdatePluginDataMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertPluginDataInput;
}>;


export type UpdatePluginDataMutation = { __typename: 'Mutations', updatePluginData: { __typename: 'PluginDataNode', id: string } };


export const PluginDataDocument = gql`
    query pluginData($storeId: String!, $stockLineId: String!) {
  pluginData(
    storeId: $storeId
    type: STOCK_LINE
    filter: {relatedRecordId: {equalTo: $stockLineId}}
  ) {
    ... on NodeError {
      __typename
      error {
        description
      }
    }
    ... on PluginDataNode {
      __typename
      id
      data
      pluginName
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
    mutation updatePluginData($storeId: String!, $input: InsertPluginDataInput!) {
  updatePluginData(input: $input, storeId: $storeId) {
    ... on PluginDataNode {
      __typename
      id
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    pluginData(variables: PluginDataQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PluginDataQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PluginDataQuery>(PluginDataDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'pluginData', 'query');
    },
    insertPluginData(variables: InsertPluginDataMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertPluginDataMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertPluginDataMutation>(InsertPluginDataDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertPluginData', 'mutation');
    },
    updatePluginData(variables: UpdatePluginDataMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdatePluginDataMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdatePluginDataMutation>(UpdatePluginDataDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updatePluginData', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPluginDataQuery((req, res, ctx) => {
 *   const { storeId, stockLineId } = req.variables;
 *   return res(
 *     ctx.data({ pluginData })
 *   )
 * })
 */
export const mockPluginDataQuery = (resolver: ResponseResolver<GraphQLRequest<PluginDataQueryVariables>, GraphQLContext<PluginDataQuery>, any>) =>
  graphql.query<PluginDataQuery, PluginDataQueryVariables>(
    'pluginData',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertPluginDataMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertPluginData })
 *   )
 * })
 */
export const mockInsertPluginDataMutation = (resolver: ResponseResolver<GraphQLRequest<InsertPluginDataMutationVariables>, GraphQLContext<InsertPluginDataMutation>, any>) =>
  graphql.mutation<InsertPluginDataMutation, InsertPluginDataMutationVariables>(
    'insertPluginData',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdatePluginDataMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updatePluginData })
 *   )
 * })
 */
export const mockUpdatePluginDataMutation = (resolver: ResponseResolver<GraphQLRequest<UpdatePluginDataMutationVariables>, GraphQLContext<UpdatePluginDataMutation>, any>) =>
  graphql.mutation<UpdatePluginDataMutation, UpdatePluginDataMutationVariables>(
    'updatePluginData',
    resolver
  )
