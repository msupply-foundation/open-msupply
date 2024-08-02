import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    inventoryAdjustmentReasons(variables?: InventoryAdjustmentReasonsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InventoryAdjustmentReasonsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InventoryAdjustmentReasonsQuery>(InventoryAdjustmentReasonsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inventoryAdjustmentReasons', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;