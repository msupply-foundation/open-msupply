import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ItemWithStatsFragment = { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } };

export type RequestRowFragment = { __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string };

export type RequestLineFragment = { __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, suggestedQuantity: number, comment?: string | null, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } } };

export type RequestFragment = { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, minMonthsOfStock: number, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, suggestedQuantity: number, comment?: string | null, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } } }> }, shipments: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null }> }, otherParty: { __typename: 'NameNode', id: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null } };

export type RequestByNumberQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  requisitionNumber: Types.Scalars['Int'];
}>;


export type RequestByNumberQuery = { __typename: 'Queries', requisitionByNumber: { __typename: 'RecordNotFound', description: string } | { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, minMonthsOfStock: number, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, suggestedQuantity: number, comment?: string | null, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } } }> }, shipments: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null }> } } };

export type RequisitionLineChartQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  requisitionLineId: Types.Scalars['String'];
}>;


export type RequisitionLineChartQuery = { __typename: 'Queries', requisitionLineChart: { __typename: 'ItemChartNode', calculationDate?: string | null, consumptionHistory?: { __typename: 'ConsumptionHistoryConnector', totalCount: number, nodes: Array<{ __typename: 'ConsumptionHistoryNode', averageMonthlyConsumption: number, consumption: number, date: string, isCurrent: boolean, isHistoric: boolean }> } | null, stockEvolution?: { __typename: 'StockEvolutionConnector', totalCount: number, nodes: Array<{ __typename: 'StockEvolutionNode', date: string, isHistoric: boolean, isProjected: boolean, minimumStockOnHand: number, maximumStockOnHand: number, stockOnHand: number }> } | null, suggestedQuantityCalculation: { __typename: 'SuggestedQuantityCalculationNode', suggestedQuantity: number, stockOnHand: number, minimumStockOnHand: number, maximumStockOnHand: number, averageMonthlyConsumption: number } } | { __typename: 'RequisitionLineChartError', error: { __typename: 'RecordNotFound', description: string } } };

export type RequestsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  filter?: Types.InputMaybe<Types.RequisitionFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.RequisitionSortInput> | Types.RequisitionSortInput>;
}>;


export type RequestsQuery = { __typename: 'Queries', requisitions: { __typename: 'RequisitionConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string }> } };

export type InsertRequestLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertRequestRequisitionLineInput;
}>;


export type InsertRequestLineMutation = { __typename: 'Mutations', insertRequestRequisitionLine: { __typename: 'InsertRequestRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RequisitionLineWithItemIdExists', description: string } } | { __typename: 'RequisitionLineNode', id: string } };

export type UpdateRequestLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateRequestRequisitionLineInput;
}>;


export type UpdateRequestLineMutation = { __typename: 'Mutations', updateRequestRequisitionLine: { __typename: 'RequisitionLineNode', id: string } | { __typename: 'UpdateRequestRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } };

export type AddFromMasterListMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  requestId: Types.Scalars['String'];
  masterListId: Types.Scalars['String'];
}>;


export type AddFromMasterListMutation = { __typename: 'Mutations', addFromMasterList: { __typename: 'AddFromMasterListError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'MasterListNotFoundForThisStore', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'RequisitionLineConnector', totalCount: number } };

export type DeleteRequestLinesMutationVariables = Types.Exact<{
  ids?: Types.InputMaybe<Array<Types.DeleteRequestRequisitionLineInput> | Types.DeleteRequestRequisitionLineInput>;
  storeId: Types.Scalars['String'];
}>;


export type DeleteRequestLinesMutation = { __typename: 'Mutations', batchRequestRequisition: { __typename: 'BatchRequestRequisitionResponse', deleteRequestRequisitionLines?: Array<{ __typename: 'DeleteRequestRequisitionLineResponseWithId', id: string, response: { __typename: 'DeleteRequestRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type UseSuggestedQuantityMutationVariables = Types.Exact<{
  requestId: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type UseSuggestedQuantityMutation = { __typename: 'Mutations', useSuggestedQuantity: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string }> } | { __typename: 'UseSuggestedQuantityError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type InsertRequestMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertRequestRequisitionInput;
}>;


export type InsertRequestMutation = { __typename: 'Mutations', insertRequestRequisition: { __typename: 'InsertRequestRequisitionError', error: { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'RequisitionNode', id: string, requisitionNumber: number } };

export type UpdateRequestMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateRequestRequisitionInput;
}>;


export type UpdateRequestMutation = { __typename: 'Mutations', updateRequestRequisition: { __typename: 'RequisitionNode', id: string, requisitionNumber: number } | { __typename: 'UpdateRequestRequisitionError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type DeleteRequestMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.BatchRequestRequisitionInput;
}>;


export type DeleteRequestMutation = { __typename: 'Mutations', batchRequestRequisition: { __typename: 'BatchRequestRequisitionResponse', deleteRequestRequisitions?: Array<{ __typename: 'DeleteRequestRequisitionResponseWithId', id: string, response: { __typename: 'DeleteRequestRequisitionError', error: { __typename: 'CannotDeleteRequisitionWithLines', description: string } | { __typename: 'CannotEditRequisition', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export const RequestRowFragmentDoc = gql`
    fragment RequestRow on RequisitionNode {
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
export const ItemWithStatsFragmentDoc = gql`
    fragment ItemWithStats on ItemNode {
  id
  name
  code
  unitName
  defaultPackSize
  stats(storeId: $storeId) {
    averageMonthlyConsumption
    availableStockOnHand
    availableMonthsOfStockOnHand
  }
}
    `;
export const RequestLineFragmentDoc = gql`
    fragment RequestLine on RequisitionLineNode {
  id
  itemId
  requestedQuantity
  suggestedQuantity
  comment
  itemStats {
    __typename
    availableStockOnHand
    availableMonthsOfStockOnHand
    averageMonthlyConsumption
  }
  item {
    ...ItemWithStats
  }
}
    ${ItemWithStatsFragmentDoc}`;
export const RequestFragmentDoc = gql`
    fragment Request on RequisitionNode {
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
  user {
    __typename
    username
    email
  }
  lines {
    __typename
    totalCount
    nodes {
      ...RequestLine
    }
  }
  shipments {
    __typename
    totalCount
    nodes {
      __typename
      id
      invoiceNumber
      createdDatetime
      user {
        __typename
        username
      }
    }
  }
  otherParty(storeId: $storeId) {
    id
    code
    isCustomer
    isSupplier
    isOnHold
    name
    store {
      id
      code
    }
  }
}
    ${RequestLineFragmentDoc}`;
export const RequestByNumberDocument = gql`
    query requestByNumber($storeId: String!, $requisitionNumber: Int!) {
  requisitionByNumber(
    requisitionNumber: $requisitionNumber
    type: REQUEST
    storeId: $storeId
  ) {
    __typename
    ... on RequisitionNode {
      ...Request
      otherParty(storeId: $storeId) {
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
    ... on RecordNotFound {
      __typename
      description
    }
  }
}
    ${RequestFragmentDoc}`;
export const RequisitionLineChartDocument = gql`
    query requisitionLineChart($storeId: String!, $requisitionLineId: String!) {
  requisitionLineChart(
    requestRequisitionLineId: $requisitionLineId
    storeId: $storeId
  ) {
    ... on ItemChartNode {
      __typename
      calculationDate
      consumptionHistory {
        totalCount
        nodes {
          averageMonthlyConsumption
          consumption
          date
          isCurrent
          isHistoric
        }
      }
      stockEvolution {
        nodes {
          date
          isHistoric
          isProjected
          minimumStockOnHand
          maximumStockOnHand
          stockOnHand
        }
        totalCount
      }
      suggestedQuantityCalculation {
        suggestedQuantity
        stockOnHand
        minimumStockOnHand
        maximumStockOnHand
        averageMonthlyConsumption
      }
    }
    ... on RequisitionLineChartError {
      __typename
      error {
        ... on RecordNotFound {
          __typename
          description
        }
        description
      }
    }
  }
}
    `;
export const RequestsDocument = gql`
    query requests($storeId: String!, $filter: RequisitionFilterInput, $page: PaginationInput, $sort: [RequisitionSortInput!]) {
  requisitions(storeId: $storeId, filter: $filter, page: $page, sort: $sort) {
    ... on RequisitionConnector {
      totalCount
      nodes {
        ...RequestRow
      }
    }
  }
}
    ${RequestRowFragmentDoc}`;
export const InsertRequestLineDocument = gql`
    mutation insertRequestLine($storeId: String!, $input: InsertRequestRequisitionLineInput!) {
  insertRequestRequisitionLine(input: $input, storeId: $storeId) {
    ... on RequisitionLineNode {
      __typename
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
export const UpdateRequestLineDocument = gql`
    mutation updateRequestLine($storeId: String!, $input: UpdateRequestRequisitionLineInput!) {
  updateRequestRequisitionLine(input: $input, storeId: $storeId) {
    ... on RequisitionLineNode {
      __typename
      id
    }
    ... on UpdateRequestRequisitionLineError {
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
        ... on RecordNotFound {
          __typename
          description
        }
      }
    }
  }
}
    `;
export const AddFromMasterListDocument = gql`
    mutation addFromMasterList($storeId: String!, $requestId: String!, $masterListId: String!) {
  addFromMasterList(
    input: {requestRequisitionId: $requestId, masterListId: $masterListId}
    storeId: $storeId
  ) {
    ... on RequisitionLineConnector {
      __typename
      totalCount
    }
    ... on AddFromMasterListError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on CannotEditRequisition {
          __typename
          description
        }
        ... on MasterListNotFoundForThisStore {
          __typename
          description
        }
      }
    }
  }
}
    `;
export const DeleteRequestLinesDocument = gql`
    mutation deleteRequestLines($ids: [DeleteRequestRequisitionLineInput!], $storeId: String!) {
  batchRequestRequisition(
    input: {deleteRequestRequisitionLines: $ids}
    storeId: $storeId
  ) {
    deleteRequestRequisitionLines {
      id
      response {
        ... on DeleteRequestRequisitionLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotEditRequisition {
              __typename
              description
            }
          }
        }
        ... on DeleteResponse {
          id
        }
      }
    }
  }
}
    `;
export const UseSuggestedQuantityDocument = gql`
    mutation useSuggestedQuantity($requestId: String!, $storeId: String!) {
  useSuggestedQuantity(
    input: {requestRequisitionId: $requestId}
    storeId: $storeId
  ) {
    ... on UseSuggestedQuantityError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on CannotEditRequisition {
          __typename
          description
        }
      }
    }
    ... on RequisitionLineConnector {
      nodes {
        id
      }
      totalCount
    }
  }
}
    `;
export const InsertRequestDocument = gql`
    mutation insertRequest($storeId: String!, $input: InsertRequestRequisitionInput!) {
  insertRequestRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
      requisitionNumber
    }
    ... on InsertRequestRequisitionError {
      __typename
      error {
        description
        ... on OtherPartyNotASupplier {
          __typename
          description
        }
      }
    }
  }
}
    `;
export const UpdateRequestDocument = gql`
    mutation updateRequest($storeId: String!, $input: UpdateRequestRequisitionInput!) {
  updateRequestRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
      requisitionNumber
    }
    ... on UpdateRequestRequisitionError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on CannotEditRequisition {
          __typename
          description
        }
        ... on OtherPartyNotASupplier {
          __typename
          description
        }
      }
    }
  }
}
    `;
export const DeleteRequestDocument = gql`
    mutation deleteRequest($storeId: String!, $input: BatchRequestRequisitionInput!) {
  batchRequestRequisition(storeId: $storeId, input: $input) {
    deleteRequestRequisitions {
      id
      response {
        ... on DeleteRequestRequisitionError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotDeleteRequisitionWithLines {
              __typename
              description
            }
            ... on CannotEditRequisition {
              __typename
              description
            }
          }
        }
        ... on DeleteResponse {
          id
        }
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    requestByNumber(variables: RequestByNumberQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<RequestByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequestByNumberQuery>(RequestByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'requestByNumber', 'query');
    },
    requisitionLineChart(variables: RequisitionLineChartQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<RequisitionLineChartQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequisitionLineChartQuery>(RequisitionLineChartDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'requisitionLineChart', 'query');
    },
    requests(variables: RequestsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<RequestsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequestsQuery>(RequestsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'requests', 'query');
    },
    insertRequestLine(variables: InsertRequestLineMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertRequestLineMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertRequestLineMutation>(InsertRequestLineDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertRequestLine', 'mutation');
    },
    updateRequestLine(variables: UpdateRequestLineMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateRequestLineMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateRequestLineMutation>(UpdateRequestLineDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateRequestLine', 'mutation');
    },
    addFromMasterList(variables: AddFromMasterListMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<AddFromMasterListMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<AddFromMasterListMutation>(AddFromMasterListDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'addFromMasterList', 'mutation');
    },
    deleteRequestLines(variables: DeleteRequestLinesMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteRequestLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteRequestLinesMutation>(DeleteRequestLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteRequestLines', 'mutation');
    },
    useSuggestedQuantity(variables: UseSuggestedQuantityMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UseSuggestedQuantityMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UseSuggestedQuantityMutation>(UseSuggestedQuantityDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'useSuggestedQuantity', 'mutation');
    },
    insertRequest(variables: InsertRequestMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertRequestMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertRequestMutation>(InsertRequestDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertRequest', 'mutation');
    },
    updateRequest(variables: UpdateRequestMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateRequestMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateRequestMutation>(UpdateRequestDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateRequest', 'mutation');
    },
    deleteRequest(variables: DeleteRequestMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteRequestMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteRequestMutation>(DeleteRequestDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteRequest', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockRequestByNumberQuery((req, res, ctx) => {
 *   const { storeId, requisitionNumber } = req.variables;
 *   return res(
 *     ctx.data({ requisitionByNumber })
 *   )
 * })
 */
export const mockRequestByNumberQuery = (resolver: ResponseResolver<GraphQLRequest<RequestByNumberQueryVariables>, GraphQLContext<RequestByNumberQuery>, any>) =>
  graphql.query<RequestByNumberQuery, RequestByNumberQueryVariables>(
    'requestByNumber',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockRequisitionLineChartQuery((req, res, ctx) => {
 *   const { storeId, requisitionLineId } = req.variables;
 *   return res(
 *     ctx.data({ requisitionLineChart })
 *   )
 * })
 */
export const mockRequisitionLineChartQuery = (resolver: ResponseResolver<GraphQLRequest<RequisitionLineChartQueryVariables>, GraphQLContext<RequisitionLineChartQuery>, any>) =>
  graphql.query<RequisitionLineChartQuery, RequisitionLineChartQueryVariables>(
    'requisitionLineChart',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockRequestsQuery((req, res, ctx) => {
 *   const { storeId, filter, page, sort } = req.variables;
 *   return res(
 *     ctx.data({ requisitions })
 *   )
 * })
 */
export const mockRequestsQuery = (resolver: ResponseResolver<GraphQLRequest<RequestsQueryVariables>, GraphQLContext<RequestsQuery>, any>) =>
  graphql.query<RequestsQuery, RequestsQueryVariables>(
    'requests',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertRequestLineMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertRequestRequisitionLine })
 *   )
 * })
 */
export const mockInsertRequestLineMutation = (resolver: ResponseResolver<GraphQLRequest<InsertRequestLineMutationVariables>, GraphQLContext<InsertRequestLineMutation>, any>) =>
  graphql.mutation<InsertRequestLineMutation, InsertRequestLineMutationVariables>(
    'insertRequestLine',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateRequestLineMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateRequestRequisitionLine })
 *   )
 * })
 */
export const mockUpdateRequestLineMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateRequestLineMutationVariables>, GraphQLContext<UpdateRequestLineMutation>, any>) =>
  graphql.mutation<UpdateRequestLineMutation, UpdateRequestLineMutationVariables>(
    'updateRequestLine',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAddFromMasterListMutation((req, res, ctx) => {
 *   const { storeId, requestId, masterListId } = req.variables;
 *   return res(
 *     ctx.data({ addFromMasterList })
 *   )
 * })
 */
export const mockAddFromMasterListMutation = (resolver: ResponseResolver<GraphQLRequest<AddFromMasterListMutationVariables>, GraphQLContext<AddFromMasterListMutation>, any>) =>
  graphql.mutation<AddFromMasterListMutation, AddFromMasterListMutationVariables>(
    'addFromMasterList',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteRequestLinesMutation((req, res, ctx) => {
 *   const { ids, storeId } = req.variables;
 *   return res(
 *     ctx.data({ batchRequestRequisition })
 *   )
 * })
 */
export const mockDeleteRequestLinesMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteRequestLinesMutationVariables>, GraphQLContext<DeleteRequestLinesMutation>, any>) =>
  graphql.mutation<DeleteRequestLinesMutation, DeleteRequestLinesMutationVariables>(
    'deleteRequestLines',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUseSuggestedQuantityMutation((req, res, ctx) => {
 *   const { requestId, storeId } = req.variables;
 *   return res(
 *     ctx.data({ useSuggestedQuantity })
 *   )
 * })
 */
export const mockUseSuggestedQuantityMutation = (resolver: ResponseResolver<GraphQLRequest<UseSuggestedQuantityMutationVariables>, GraphQLContext<UseSuggestedQuantityMutation>, any>) =>
  graphql.mutation<UseSuggestedQuantityMutation, UseSuggestedQuantityMutationVariables>(
    'useSuggestedQuantity',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertRequestMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertRequestRequisition })
 *   )
 * })
 */
export const mockInsertRequestMutation = (resolver: ResponseResolver<GraphQLRequest<InsertRequestMutationVariables>, GraphQLContext<InsertRequestMutation>, any>) =>
  graphql.mutation<InsertRequestMutation, InsertRequestMutationVariables>(
    'insertRequest',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateRequestMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateRequestRequisition })
 *   )
 * })
 */
export const mockUpdateRequestMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateRequestMutationVariables>, GraphQLContext<UpdateRequestMutation>, any>) =>
  graphql.mutation<UpdateRequestMutation, UpdateRequestMutationVariables>(
    'updateRequest',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteRequestMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ batchRequestRequisition })
 *   )
 * })
 */
export const mockDeleteRequestMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteRequestMutationVariables>, GraphQLContext<DeleteRequestMutation>, any>) =>
  graphql.mutation<DeleteRequestMutation, DeleteRequestMutationVariables>(
    'deleteRequest',
    resolver
  )
