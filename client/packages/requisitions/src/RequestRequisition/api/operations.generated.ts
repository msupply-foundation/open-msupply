import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type InsertRequestRequisitionMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertRequestRequisitionInput;
}>;


export type InsertRequestRequisitionMutation = { __typename: 'Mutations', insertRequestRequisition: { __typename: 'InsertRequestRequisitionError' } | { __typename: 'RequisitionNode', id: string, requisitionNumber: number } };

export type UpdateRequestRequisitionMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateRequestRequisitionInput;
}>;


export type UpdateRequestRequisitionMutation = { __typename: 'Mutations', updateRequestRequisition: { __typename: 'RequisitionNode', id: string } | { __typename: 'UpdateRequestRequisitionError' } };

export type RequestRequisitionLineFragment = { __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, suggestedQuantity: number, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand: number, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null } };

export type RequestRequisitionFragment = { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, minMonthsOfStock: number, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, suggestedQuantity: number, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand: number, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null } }> }, otherParty: { __typename: 'NameNode', id: string, code: string, isCustomer: boolean, isSupplier: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null } };

export type RequestRequisitionQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  requisitionNumber: Types.Scalars['Int'];
}>;


export type RequestRequisitionQuery = { __typename: 'Queries', requisitionByNumber: { __typename: 'RecordNotFound' } | { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, minMonthsOfStock: number, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, suggestedQuantity: number, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand: number, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null } }> } } };

export type RequestRequisitionRowFragment = { __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string };

export type RequestRequisitionsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  filter?: Types.InputMaybe<Types.RequisitionFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.RequisitionSortInput> | Types.RequisitionSortInput>;
}>;


export type RequestRequisitionsQuery = { __typename: 'Queries', requisitions: { __typename: 'RequisitionConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string }> } };

export type InsertRequestRequisitionLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertRequestRequisitionLineInput;
}>;


export type InsertRequestRequisitionLineMutation = { __typename: 'Mutations', insertRequestRequisitionLine: { __typename: 'InsertRequestRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RequisitionLineWithItemIdExists', description: string } } | { __typename: 'RequisitionLineNode', id: string } };

export type UpdateRequestRequisitionLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateRequestRequisitionLineInput;
}>;


export type UpdateRequestRequisitionLineMutation = { __typename: 'Mutations', updateRequestRequisitionLine: { __typename: 'RequisitionLineNode', id: string } | { __typename: 'UpdateRequestRequisitionLineError' } };

export const RequestRequisitionLineFragmentDoc = gql`
    fragment RequestRequisitionLine on RequisitionLineNode {
  id
  itemId
  requestedQuantity
  suggestedQuantity
  itemStats {
    __typename
    availableStockOnHand
    availableMonthsOfStockOnHand
    averageMonthlyConsumption
  }
  item {
    id
    name
    code
    unitName
  }
}
    `;
export const RequestRequisitionFragmentDoc = gql`
    fragment RequestRequisition on RequisitionNode {
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
  minMonthsOfStock
  lines {
    __typename
    totalCount
    nodes {
      ...RequestRequisitionLine
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
    ${RequestRequisitionLineFragmentDoc}`;
export const RequestRequisitionRowFragmentDoc = gql`
    fragment RequestRequisitionRow on RequisitionNode {
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
export const InsertRequestRequisitionDocument = gql`
    mutation insertRequestRequisition($storeId: String!, $input: InsertRequestRequisitionInput!) {
  insertRequestRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
      requisitionNumber
    }
  }
}
    `;
export const UpdateRequestRequisitionDocument = gql`
    mutation updateRequestRequisition($storeId: String!, $input: UpdateRequestRequisitionInput!) {
  updateRequestRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
    }
  }
}
    `;
export const RequestRequisitionDocument = gql`
    query requestRequisition($storeId: String!, $requisitionNumber: Int!) {
  requisitionByNumber(
    requisitionNumber: $requisitionNumber
    type: REQUEST
    storeId: $storeId
  ) {
    __typename
    ... on RequisitionNode {
      ...RequestRequisition
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
    ${RequestRequisitionFragmentDoc}`;
export const RequestRequisitionsDocument = gql`
    query requestRequisitions($storeId: String!, $filter: RequisitionFilterInput, $page: PaginationInput, $sort: [RequisitionSortInput!]) {
  requisitions(storeId: $storeId, filter: $filter, page: $page, sort: $sort) {
    ... on RequisitionConnector {
      totalCount
      nodes {
        ...RequestRequisitionRow
      }
    }
  }
}
    ${RequestRequisitionRowFragmentDoc}`;
export const InsertRequestRequisitionLineDocument = gql`
    mutation insertRequestRequisitionLine($storeId: String!, $input: InsertRequestRequisitionLineInput!) {
  insertRequestRequisitionLine(input: $input, storeId: $storeId) {
    ... on RequisitionLineNode {
      id
    }
    ... on InsertRequestRequisitionLineError {
      __typename
      error {
        description
        ... on CannotEditRequisition {
          __typename
          description
        }
        ... on ForeignKeyError {
          __typename
          description
          key
        }
        ... on RequisitionLineWithItemIdExists {
          __typename
          description
        }
      }
    }
  }
}
    `;
export const UpdateRequestRequisitionLineDocument = gql`
    mutation updateRequestRequisitionLine($storeId: String!, $input: UpdateRequestRequisitionLineInput!) {
  updateRequestRequisitionLine(input: $input, storeId: $storeId) {
    ... on RequisitionLineNode {
      id
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    insertRequestRequisition(variables: InsertRequestRequisitionMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertRequestRequisitionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertRequestRequisitionMutation>(InsertRequestRequisitionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertRequestRequisition');
    },
    updateRequestRequisition(variables: UpdateRequestRequisitionMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateRequestRequisitionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateRequestRequisitionMutation>(UpdateRequestRequisitionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateRequestRequisition');
    },
    requestRequisition(variables: RequestRequisitionQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<RequestRequisitionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequestRequisitionQuery>(RequestRequisitionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'requestRequisition');
    },
    requestRequisitions(variables: RequestRequisitionsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<RequestRequisitionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequestRequisitionsQuery>(RequestRequisitionsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'requestRequisitions');
    },
    insertRequestRequisitionLine(variables: InsertRequestRequisitionLineMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertRequestRequisitionLineMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertRequestRequisitionLineMutation>(InsertRequestRequisitionLineDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertRequestRequisitionLine');
    },
    updateRequestRequisitionLine(variables: UpdateRequestRequisitionLineMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateRequestRequisitionLineMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateRequestRequisitionLineMutation>(UpdateRequestRequisitionLineDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateRequestRequisitionLine');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertRequestRequisitionMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertRequestRequisition })
 *   )
 * })
 */
export const mockInsertRequestRequisitionMutation = (resolver: ResponseResolver<GraphQLRequest<InsertRequestRequisitionMutationVariables>, GraphQLContext<InsertRequestRequisitionMutation>, any>) =>
  graphql.mutation<InsertRequestRequisitionMutation, InsertRequestRequisitionMutationVariables>(
    'insertRequestRequisition',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateRequestRequisitionMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateRequestRequisition })
 *   )
 * })
 */
export const mockUpdateRequestRequisitionMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateRequestRequisitionMutationVariables>, GraphQLContext<UpdateRequestRequisitionMutation>, any>) =>
  graphql.mutation<UpdateRequestRequisitionMutation, UpdateRequestRequisitionMutationVariables>(
    'updateRequestRequisition',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockRequestRequisitionQuery((req, res, ctx) => {
 *   const { storeId, requisitionNumber } = req.variables;
 *   return res(
 *     ctx.data({ requisitionByNumber })
 *   )
 * })
 */
export const mockRequestRequisitionQuery = (resolver: ResponseResolver<GraphQLRequest<RequestRequisitionQueryVariables>, GraphQLContext<RequestRequisitionQuery>, any>) =>
  graphql.query<RequestRequisitionQuery, RequestRequisitionQueryVariables>(
    'requestRequisition',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockRequestRequisitionsQuery((req, res, ctx) => {
 *   const { storeId, filter, page, sort } = req.variables;
 *   return res(
 *     ctx.data({ requisitions })
 *   )
 * })
 */
export const mockRequestRequisitionsQuery = (resolver: ResponseResolver<GraphQLRequest<RequestRequisitionsQueryVariables>, GraphQLContext<RequestRequisitionsQuery>, any>) =>
  graphql.query<RequestRequisitionsQuery, RequestRequisitionsQueryVariables>(
    'requestRequisitions',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertRequestRequisitionLineMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertRequestRequisitionLine })
 *   )
 * })
 */
export const mockInsertRequestRequisitionLineMutation = (resolver: ResponseResolver<GraphQLRequest<InsertRequestRequisitionLineMutationVariables>, GraphQLContext<InsertRequestRequisitionLineMutation>, any>) =>
  graphql.mutation<InsertRequestRequisitionLineMutation, InsertRequestRequisitionLineMutationVariables>(
    'insertRequestRequisitionLine',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateRequestRequisitionLineMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateRequestRequisitionLine })
 *   )
 * })
 */
export const mockUpdateRequestRequisitionLineMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateRequestRequisitionLineMutationVariables>, GraphQLContext<UpdateRequestRequisitionLineMutation>, any>) =>
  graphql.mutation<UpdateRequestRequisitionLineMutation, UpdateRequestRequisitionLineMutationVariables>(
    'updateRequestRequisitionLine',
    resolver
  )
