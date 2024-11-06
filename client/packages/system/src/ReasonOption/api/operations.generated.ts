import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ReasonOptionRowFragment = { __typename: 'ReasonOptionNode', id: string, type: Types.ReasonOptionNodeType, reason: string, isActive: boolean };

export type ReasonOptionsQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<Array<Types.ReasonOptionSortInput> | Types.ReasonOptionSortInput>;
  filter?: Types.InputMaybe<Types.ReasonOptionFilterInput>;
}>;


export type ReasonOptionsQuery = { __typename: 'Queries', reasonOptions: { __typename: 'ReasonOptionConnector', totalCount: number, nodes: Array<{ __typename: 'ReasonOptionNode', id: string, type: Types.ReasonOptionNodeType, reason: string, isActive: boolean }> } };

export const ReasonOptionRowFragmentDoc = gql`
    fragment ReasonOptionRow on ReasonOptionNode {
  __typename
  id
  type
  reason
  isActive
}
    `;
export const ReasonOptionsDocument = gql`
    query reasonOptions($sort: [ReasonOptionSortInput!], $filter: ReasonOptionFilterInput) {
  reasonOptions(sort: $sort, filter: $filter) {
    __typename
    ... on ReasonOptionConnector {
      __typename
      totalCount
      nodes {
        __typename
        id
        type
        reason
        isActive
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    reasonOptions(variables?: ReasonOptionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ReasonOptionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ReasonOptionsQuery>(ReasonOptionsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'reasonOptions', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;