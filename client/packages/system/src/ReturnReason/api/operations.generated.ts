import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    returnReasons(variables?: ReturnReasonsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ReturnReasonsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ReturnReasonsQuery>(ReturnReasonsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'returnReasons', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;