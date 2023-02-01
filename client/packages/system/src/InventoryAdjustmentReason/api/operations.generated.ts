import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type InventoryAdjustmentReasonRowFragment = { __typename: 'InventoryAdjustmentReasonNode', id: string, type: Types.InventoryAdjustmentReasonNodeType, reason: string };

export type InventoryAdjustmentReasonsQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<Array<Types.InventoryAdjustmentReasonSortInput> | Types.InventoryAdjustmentReasonSortInput>;
  filter?: Types.InputMaybe<Types.InventoryAdjustmentReasonFilterInput>;
}>;


export type InventoryAdjustmentReasonsQuery = { __typename: 'Queries', inventoryAdjustmentReasons: { __typename: 'InventoryAdjustmentReasonConnector', totalCount: number, nodes: Array<{ __typename: 'InventoryAdjustmentReasonNode', id: string, type: Types.InventoryAdjustmentReasonNodeType, reason: string }> } };

export const InventoryAdjustmentReasonRowFragmentDoc = gql`
    fragment InventoryAdjustmentReasonRow on InventoryAdjustmentReasonNode {
  __typename
  id
  type
  reason
}
    `;
export const InventoryAdjustmentReasonsDocument = gql`
    query inventoryAdjustmentReasons($sort: [InventoryAdjustmentReasonSortInput!], $filter: InventoryAdjustmentReasonFilterInput) {
  inventoryAdjustmentReasons(sort: $sort, filter: $filter) {
    __typename
    ... on InventoryAdjustmentReasonConnector {
      __typename
      totalCount
      nodes {
        __typename
        id
        type
        reason
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    inventoryAdjustmentReasons(variables?: InventoryAdjustmentReasonsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InventoryAdjustmentReasonsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InventoryAdjustmentReasonsQuery>(InventoryAdjustmentReasonsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inventoryAdjustmentReasons', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInventoryAdjustmentReasonsQuery((req, res, ctx) => {
 *   const { sort, filter } = req.variables;
 *   return res(
 *     ctx.data({ inventoryAdjustmentReasons })
 *   )
 * })
 */
export const mockInventoryAdjustmentReasonsQuery = (resolver: ResponseResolver<GraphQLRequest<InventoryAdjustmentReasonsQueryVariables>, GraphQLContext<InventoryAdjustmentReasonsQuery>, any>) =>
  graphql.query<InventoryAdjustmentReasonsQuery, InventoryAdjustmentReasonsQueryVariables>(
    'inventoryAdjustmentReasons',
    resolver
  )
