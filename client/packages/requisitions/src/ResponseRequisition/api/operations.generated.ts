import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type UpdateResponseRequisitionMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateResponseRequisitionInput;
}>;


export type UpdateResponseRequisitionMutation = { __typename: 'Mutations', updateResponseRequisition: { __typename: 'RequisitionNode', id: string } | { __typename: 'UpdateResponseRequisitionError' } };

export type ResponseRequisitionLineFragment = { __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, calculatedQuantity: number, itemStats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, stockOnHand: number, monthsOfStock: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null } };

export type ResponseRequisitionFragment = { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, thresholdMonthsOfStock: number, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, calculatedQuantity: number, itemStats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, stockOnHand: number, monthsOfStock: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null } }> }, otherParty: { __typename: 'NameNode', id: string, code: string, isCustomer: boolean, isSupplier: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null } };

export type ResponseRequisitionQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  requisitionNumber: Types.Scalars['Int'];
}>;


export type ResponseRequisitionQuery = { __typename: 'Queries', requisitionByNumber: { __typename: 'RecordNotFound' } | { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, thresholdMonthsOfStock: number, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, calculatedQuantity: number, itemStats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, stockOnHand: number, monthsOfStock: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null } }> } } };

export type ResponseRequisitionRowFragment = { __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string };

export type ResponseRequisitionsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  filter?: Types.InputMaybe<Types.RequisitionFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Types.RequisitionSortInput>;
}>;


export type ResponseRequisitionsQuery = { __typename: 'Queries', requisitions: { __typename: 'RequisitionConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string }> } };

export const ResponseRequisitionLineFragmentDoc = gql`
    fragment ResponseRequisitionLine on RequisitionLineNode {
  id
  itemId
  requestedQuantity
  calculatedQuantity
  itemStats {
    averageMonthlyConsumption
    stockOnHand
    monthsOfStock
  }
  item {
    id
    name
    code
    unitName
  }
}
    `;
export const ResponseRequisitionFragmentDoc = gql`
    fragment ResponseRequisition on RequisitionNode {
  __typename
  id
  type
  status
  createdDatetime
  sentDatetime
  finalisedDatetime
  requisitionNumber
  colour
  theirReference
  comment
  otherPartyName
  otherPartyId
  maxMonthsOfStock
  thresholdMonthsOfStock
  lines {
    __typename
    ... on RequisitionLineConnector {
      totalCount
      nodes {
        ...ResponseRequisitionLine
      }
    }
  }
  otherParty {
    id
    code
    isCustomer
    isSupplier
    name
    store {
      id
      code
    }
  }
}
    ${ResponseRequisitionLineFragmentDoc}`;
export const ResponseRequisitionRowFragmentDoc = gql`
    fragment ResponseRequisitionRow on RequisitionNode {
  colour
  comment
  createdDatetime
  finalisedDatetime
  id
  otherPartyName
  requisitionNumber
  sentDatetime
  status
  theirReference
  type
  otherPartyId
}
    `;
export const UpdateResponseRequisitionDocument = gql`
    mutation updateResponseRequisition($storeId: String!, $input: UpdateResponseRequisitionInput!) {
  updateResponseRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
    }
  }
}
    `;
export const ResponseRequisitionDocument = gql`
    query responseRequisition($storeId: String!, $requisitionNumber: Int!) {
  requisitionByNumber(
    requisitionNumber: $requisitionNumber
    type: "RESPONSE"
    storeId: $storeId
  ) {
    __typename
    ... on RequisitionNode {
      ...ResponseRequisition
      otherParty {
        __typename
        ... on NameNode {
          id
          name
          code
          isCustomer
          isSupplier
        }
      }
    }
  }
}
    ${ResponseRequisitionFragmentDoc}`;
export const ResponseRequisitionsDocument = gql`
    query responseRequisitions($storeId: String!, $filter: RequisitionFilterInput, $page: PaginationInput, $sort: RequisitionSortInput) {
  requisitions(storeId: $storeId, filter: $filter, page: $page, sort: $sort) {
    ... on RequisitionConnector {
      totalCount
      nodes {
        ...ResponseRequisitionRow
      }
    }
  }
}
    ${ResponseRequisitionRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    updateResponseRequisition(variables: UpdateResponseRequisitionMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateResponseRequisitionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateResponseRequisitionMutation>(UpdateResponseRequisitionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateResponseRequisition');
    },
    responseRequisition(variables: ResponseRequisitionQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ResponseRequisitionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ResponseRequisitionQuery>(ResponseRequisitionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'responseRequisition');
    },
    responseRequisitions(variables: ResponseRequisitionsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ResponseRequisitionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ResponseRequisitionsQuery>(ResponseRequisitionsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'responseRequisitions');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateResponseRequisitionMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateResponseRequisition })
 *   )
 * })
 */
export const mockUpdateResponseRequisitionMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateResponseRequisitionMutationVariables>, GraphQLContext<UpdateResponseRequisitionMutation>, any>) =>
  graphql.mutation<UpdateResponseRequisitionMutation, UpdateResponseRequisitionMutationVariables>(
    'updateResponseRequisition',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockResponseRequisitionQuery((req, res, ctx) => {
 *   const { storeId, requisitionNumber } = req.variables;
 *   return res(
 *     ctx.data({ requisitionByNumber })
 *   )
 * })
 */
export const mockResponseRequisitionQuery = (resolver: ResponseResolver<GraphQLRequest<ResponseRequisitionQueryVariables>, GraphQLContext<ResponseRequisitionQuery>, any>) =>
  graphql.query<ResponseRequisitionQuery, ResponseRequisitionQueryVariables>(
    'responseRequisition',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockResponseRequisitionsQuery((req, res, ctx) => {
 *   const { storeId, filter, page, sort } = req.variables;
 *   return res(
 *     ctx.data({ requisitions })
 *   )
 * })
 */
export const mockResponseRequisitionsQuery = (resolver: ResponseResolver<GraphQLRequest<ResponseRequisitionsQueryVariables>, GraphQLContext<ResponseRequisitionsQuery>, any>) =>
  graphql.query<ResponseRequisitionsQuery, ResponseRequisitionsQueryVariables>(
    'responseRequisitions',
    resolver
  )
