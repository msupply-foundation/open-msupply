import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type UpdateResponseMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateResponseRequisitionInput;
}>;


export type UpdateResponseMutation = { __typename: 'Mutations', updateResponseRequisition: { __typename: 'RequisitionNode', id: string } | { __typename: 'UpdateResponseRequisitionError' } };

export type ResponseLineFragment = { __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, supplyQuantity: number, remainingQuantityToSupply: number, alreadyIssued: number, comment?: string | null, approvedQuantity: number, approvalComment?: string | null, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, linkedRequisitionLine?: { __typename: 'RequisitionLineNode', itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number } } | null };

export type ResponseFragment = { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, minMonthsOfStock: number, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, shipments: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null }> }, linesRemainingToSupply: { __typename: 'RequisitionLineConnector', totalCount: number }, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, supplyQuantity: number, remainingQuantityToSupply: number, alreadyIssued: number, comment?: string | null, approvedQuantity: number, approvalComment?: string | null, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, linkedRequisitionLine?: { __typename: 'RequisitionLineNode', itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number } } | null }> }, otherParty: { __typename: 'NameNode', id: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }, period?: { __typename: 'PeriodNode', name: string, startDate: string, endDate: string } | null };

export type ResponseByNumberQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requisitionNumber: Types.Scalars['Int']['input'];
}>;


export type ResponseByNumberQuery = { __typename: 'Queries', requisitionByNumber: { __typename: 'RecordNotFound' } | { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, minMonthsOfStock: number, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, shipments: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null }> }, linesRemainingToSupply: { __typename: 'RequisitionLineConnector', totalCount: number }, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, supplyQuantity: number, remainingQuantityToSupply: number, alreadyIssued: number, comment?: string | null, approvedQuantity: number, approvalComment?: string | null, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, linkedRequisitionLine?: { __typename: 'RequisitionLineNode', itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number } } | null }> }, otherParty: { __typename: 'NameNode', id: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }, period?: { __typename: 'PeriodNode', name: string, startDate: string, endDate: string } | null } };

export type ResponseRowFragment = { __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, numberOfShipments: number, orderType?: string | null, period?: { __typename: 'PeriodNode', name: string, startDate: string, endDate: string } | null };

export type ResponsesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.RequisitionFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.RequisitionSortInput> | Types.RequisitionSortInput>;
}>;


export type ResponsesQuery = { __typename: 'Queries', requisitions: { __typename: 'RequisitionConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, numberOfShipments: number, orderType?: string | null, period?: { __typename: 'PeriodNode', name: string, startDate: string, endDate: string } | null }> } };

export type UpdateResponseLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateResponseRequisitionLineInput;
}>;


export type UpdateResponseLineMutation = { __typename: 'Mutations', updateResponseRequisitionLine: { __typename: 'RequisitionLineNode', id: string } | { __typename: 'UpdateResponseRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } };

export type CreateOutboundFromResponseMutationVariables = Types.Exact<{
  responseId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type CreateOutboundFromResponseMutation = { __typename: 'Mutations', createRequisitionShipment: { __typename: 'CreateRequisitionShipmentError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'NothingRemainingToSupply', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type SupplyRequestedQuantityMutationVariables = Types.Exact<{
  responseId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type SupplyRequestedQuantityMutation = { __typename: 'Mutations', supplyRequestedQuantity: { __typename: 'RequisitionLineConnector', nodes: Array<{ __typename: 'RequisitionLineNode', id: string }> } | { __typename: 'SupplyRequestedQuantityError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type ResponseRequisitionStatsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requisitionLineId: Types.Scalars['String']['input'];
}>;


export type ResponseRequisitionStatsQuery = { __typename: 'Queries', responseRequisitionStats: { __typename: 'RequisitionLineStatsError', error: { __typename: 'RecordNotFound', description: string } } | { __typename: 'ResponseRequisitionStatsNode', requestStoreStats: { __typename: 'RequestStoreStatsNode', averageMonthlyConsumption: number, stockOnHand: number, maxMonthsOfStock: number, suggestedQuantity: number }, responseStoreStats: { __typename: 'ResponseStoreStatsNode', incomingStock: number, otherRequestedQuantity: number, requestedQuantity: number, stockOnHand: number, stockOnOrder: number } } };

export const ResponseLineFragmentDoc = gql`
    fragment ResponseLine on RequisitionLineNode {
  id
  itemId
  requestedQuantity
  supplyQuantity
  remainingQuantityToSupply
  alreadyIssued
  comment
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
  approvedQuantity
  approvalComment
  linkedRequisitionLine {
    itemStats {
      availableStockOnHand
    }
  }
}
    `;
export const ResponseFragmentDoc = gql`
    fragment Response on RequisitionNode {
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
  approvalStatus
  user {
    __typename
    username
    email
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
  linesRemainingToSupply {
    __typename
    totalCount
  }
  lines {
    __typename
    ... on RequisitionLineConnector {
      totalCount
      nodes {
        ...ResponseLine
      }
    }
  }
  otherParty(storeId: $storeId) {
    __typename
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
  programName
  period {
    name
    startDate
    endDate
  }
  orderType
}
    ${ResponseLineFragmentDoc}`;
export const ResponseRowFragmentDoc = gql`
    fragment ResponseRow on RequisitionNode {
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
  approvalStatus
  programName
  numberOfShipments
  period {
    name
    startDate
    endDate
  }
  orderType
}
    `;
export const UpdateResponseDocument = gql`
    mutation updateResponse($storeId: String!, $input: UpdateResponseRequisitionInput!) {
  updateResponseRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
    }
  }
}
    `;
export const ResponseByNumberDocument = gql`
    query responseByNumber($storeId: String!, $requisitionNumber: Int!) {
  requisitionByNumber(
    requisitionNumber: $requisitionNumber
    type: RESPONSE
    storeId: $storeId
  ) {
    __typename
    ... on RequisitionNode {
      ...Response
    }
  }
}
    ${ResponseFragmentDoc}`;
export const ResponsesDocument = gql`
    query responses($storeId: String!, $filter: RequisitionFilterInput, $page: PaginationInput, $sort: [RequisitionSortInput!]) {
  requisitions(storeId: $storeId, filter: $filter, page: $page, sort: $sort) {
    ... on RequisitionConnector {
      totalCount
      nodes {
        ...ResponseRow
      }
    }
  }
}
    ${ResponseRowFragmentDoc}`;
export const UpdateResponseLineDocument = gql`
    mutation updateResponseLine($storeId: String!, $input: UpdateResponseRequisitionLineInput!) {
  updateResponseRequisitionLine(input: $input, storeId: $storeId) {
    ... on RequisitionLineNode {
      __typename
      id
    }
    ... on UpdateResponseRequisitionLineError {
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
export const CreateOutboundFromResponseDocument = gql`
    mutation createOutboundFromResponse($responseId: String!, $storeId: String!) {
  createRequisitionShipment(
    input: {responseRequisitionId: $responseId}
    storeId: $storeId
  ) {
    __typename
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
    ... on CreateRequisitionShipmentError {
      __typename
      error {
        description
        ... on CannotEditRequisition {
          __typename
          description
        }
        ... on NothingRemainingToSupply {
          __typename
          description
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
export const SupplyRequestedQuantityDocument = gql`
    mutation supplyRequestedQuantity($responseId: String!, $storeId: String!) {
  supplyRequestedQuantity(
    input: {responseRequisitionId: $responseId}
    storeId: $storeId
  ) {
    ... on SupplyRequestedQuantityError {
      __typename
      error {
        ... on RecordNotFound {
          __typename
          description
        }
        description
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
    }
  }
}
    `;
export const ResponseRequisitionStatsDocument = gql`
    query responseRequisitionStats($storeId: String!, $requisitionLineId: String!) {
  responseRequisitionStats(
    requisitionLineId: $requisitionLineId
    storeId: $storeId
  ) {
    ... on ResponseRequisitionStatsNode {
      __typename
      requestStoreStats {
        averageMonthlyConsumption
        stockOnHand
        maxMonthsOfStock
        suggestedQuantity
      }
      responseStoreStats {
        incomingStock
        otherRequestedQuantity
        requestedQuantity
        stockOnHand
        stockOnOrder
      }
    }
    ... on RequisitionLineStatsError {
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    updateResponse(variables: UpdateResponseMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateResponseMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateResponseMutation>(UpdateResponseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateResponse', 'mutation');
    },
    responseByNumber(variables: ResponseByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ResponseByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ResponseByNumberQuery>(ResponseByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'responseByNumber', 'query');
    },
    responses(variables: ResponsesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ResponsesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ResponsesQuery>(ResponsesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'responses', 'query');
    },
    updateResponseLine(variables: UpdateResponseLineMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateResponseLineMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateResponseLineMutation>(UpdateResponseLineDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateResponseLine', 'mutation');
    },
    createOutboundFromResponse(variables: CreateOutboundFromResponseMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CreateOutboundFromResponseMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateOutboundFromResponseMutation>(CreateOutboundFromResponseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'createOutboundFromResponse', 'mutation');
    },
    supplyRequestedQuantity(variables: SupplyRequestedQuantityMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SupplyRequestedQuantityMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SupplyRequestedQuantityMutation>(SupplyRequestedQuantityDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'supplyRequestedQuantity', 'mutation');
    },
    responseRequisitionStats(variables: ResponseRequisitionStatsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ResponseRequisitionStatsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ResponseRequisitionStatsQuery>(ResponseRequisitionStatsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'responseRequisitionStats', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;