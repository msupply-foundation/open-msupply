import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ReturnReasonFragment = { __typename: 'ReturnReasonNode', id: string, reason: string };

export type ReturnReasonsQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<Array<Types.ReturnReasonSortInput> | Types.ReturnReasonSortInput>;
  filter?: Types.InputMaybe<Types.ReturnReasonFilterInput>;
}>;


export type ReturnReasonsQuery = { __typename: 'Queries', returnReasons: { __typename: 'ReturnReasonConnector', totalCount: number, nodes: Array<{ __typename: 'ReturnReasonNode', id: string, reason: string }> } };

export const ReturnReasonFragmentDoc = gql`
    fragment ReturnReason on ReturnReasonNode {
  __typename
  id
  reason
}
    `;
export const ReturnReasonsDocument = gql`
    query returnReasons($sort: [ReturnReasonSortInput!], $filter: ReturnReasonFilterInput) {
  returnReasons(sort: $sort, filter: $filter) {
    __typename
    ... on ReturnReasonConnector {
      __typename
      totalCount
      nodes {
        ...ReturnReason
      }
    }
  }
}
    ${ReturnReasonFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    returnReasons(variables?: ReturnReasonsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ReturnReasonsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ReturnReasonsQuery>(ReturnReasonsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'returnReasons', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockReturnReasonsQuery((req, res, ctx) => {
 *   const { sort, filter } = req.variables;
 *   return res(
 *     ctx.data({ returnReasons })
 *   )
 * })
 */
export const mockReturnReasonsQuery = (resolver: ResponseResolver<GraphQLRequest<ReturnReasonsQueryVariables>, GraphQLContext<ReturnReasonsQuery>, any>) =>
  graphql.query<ReturnReasonsQuery, ReturnReasonsQueryVariables>(
    'returnReasons',
    resolver
  )
