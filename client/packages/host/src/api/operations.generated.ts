import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ApiVersionQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type ApiVersionQuery = { __typename: 'FullQuery', apiVersion: string };


export const ApiVersionDocument = gql`
    query apiVersion {
  apiVersion
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    apiVersion(variables?: ApiVersionQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ApiVersionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ApiVersionQuery>(ApiVersionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'apiVersion');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockApiVersionQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ apiVersion })
 *   )
 * })
 */
export const mockApiVersionQuery = (resolver: ResponseResolver<GraphQLRequest<ApiVersionQueryVariables>, GraphQLContext<ApiVersionQuery>, any>) =>
  graphql.query<ApiVersionQuery, ApiVersionQueryVariables>(
    'apiVersion',
    resolver
  )
