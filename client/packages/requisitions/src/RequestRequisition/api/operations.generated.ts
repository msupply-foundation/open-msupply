import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { NameRowFragmentDoc } from '../../../../../packages/system/src/Name/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ItemWithStatsFragment = { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } };

export type RequestRowFragment = { __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, linkedRequisition?: { __typename: 'RequisitionNode', approvalStatus: Types.RequisitionNodeApprovalStatus } | null, period?: { __typename: 'PeriodNode', name: string, startDate: string, endDate: string } | null };

export type RequestLineFragment = { __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, suggestedQuantity: number, comment?: string | null, itemName: string, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, linkedRequisitionLine?: { __typename: 'RequisitionLineNode', approvedQuantity: number, approvalComment?: string | null } | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } } };

export type RequestFragment = { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, minMonthsOfStock: number, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, suggestedQuantity: number, comment?: string | null, itemName: string, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, linkedRequisitionLine?: { __typename: 'RequisitionLineNode', approvedQuantity: number, approvalComment?: string | null } | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } } }> }, shipments: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null }> }, otherParty: { __typename: 'NameNode', id: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }, linkedRequisition?: { __typename: 'RequisitionNode', approvalStatus: Types.RequisitionNodeApprovalStatus } | null, period?: { __typename: 'PeriodNode', name: string, startDate: string, endDate: string } | null };

export type ConsumptionHistoryFragment = { __typename: 'ConsumptionHistoryNode', averageMonthlyConsumption: number, consumption: number, date: string, isCurrent: boolean, isHistoric: boolean };

export type RequestByNumberQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requisitionNumber: Types.Scalars['Int']['input'];
}>;


export type RequestByNumberQuery = { __typename: 'Queries', requisitionByNumber: { __typename: 'RecordNotFound', description: string } | { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, minMonthsOfStock: number, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, suggestedQuantity: number, comment?: string | null, itemName: string, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, linkedRequisitionLine?: { __typename: 'RequisitionLineNode', approvedQuantity: number, approvalComment?: string | null } | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } } }> }, shipments: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null }> }, linkedRequisition?: { __typename: 'RequisitionNode', approvalStatus: Types.RequisitionNodeApprovalStatus } | null, period?: { __typename: 'PeriodNode', name: string, startDate: string, endDate: string } | null } };

export type RequisitionLineChartQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requisitionLineId: Types.Scalars['String']['input'];
}>;


export type RequisitionLineChartQuery = { __typename: 'Queries', requisitionLineChart: { __typename: 'ItemChartNode', calculationDate?: string | null, consumptionHistory?: { __typename: 'ConsumptionHistoryConnector', totalCount: number, nodes: Array<{ __typename: 'ConsumptionHistoryNode', averageMonthlyConsumption: number, consumption: number, date: string, isCurrent: boolean, isHistoric: boolean }> } | null, stockEvolution?: { __typename: 'StockEvolutionConnector', totalCount: number, nodes: Array<{ __typename: 'StockEvolutionNode', date: string, isHistoric: boolean, isProjected: boolean, minimumStockOnHand: number, maximumStockOnHand: number, stockOnHand: number }> } | null, suggestedQuantityCalculation: { __typename: 'SuggestedQuantityCalculationNode', suggestedQuantity: number, stockOnHand: number, minimumStockOnHand: number, maximumStockOnHand: number, averageMonthlyConsumption: number } } | { __typename: 'RequisitionLineChartError', error: { __typename: 'RecordNotFound', description: string } } };

export type RequestsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.RequisitionFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.RequisitionSortInput> | Types.RequisitionSortInput>;
}>;


export type RequestsQuery = { __typename: 'Queries', requisitions: { __typename: 'RequisitionConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, linkedRequisition?: { __typename: 'RequisitionNode', approvalStatus: Types.RequisitionNodeApprovalStatus } | null, period?: { __typename: 'PeriodNode', name: string, startDate: string, endDate: string } | null }> } };

export type InsertRequestLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertRequestRequisitionLineInput;
}>;


export type InsertRequestLineMutation = { __typename: 'Mutations', insertRequestRequisitionLine: { __typename: 'InsertRequestRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RequisitionLineWithItemIdExists', description: string } } | { __typename: 'RequisitionLineNode', id: string } };

export type UpdateRequestLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateRequestRequisitionLineInput;
}>;


export type UpdateRequestLineMutation = { __typename: 'Mutations', updateRequestRequisitionLine: { __typename: 'RequisitionLineNode', id: string } | { __typename: 'UpdateRequestRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } };

export type AddFromMasterListMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requestId: Types.Scalars['String']['input'];
  masterListId: Types.Scalars['String']['input'];
}>;


export type AddFromMasterListMutation = { __typename: 'Mutations', addFromMasterList: { __typename: 'AddFromMasterListError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'MasterListNotFoundForThisStore', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'RequisitionLineConnector', totalCount: number } };

export type DeleteRequestLinesMutationVariables = Types.Exact<{
  ids?: Types.InputMaybe<Array<Types.DeleteRequestRequisitionLineInput> | Types.DeleteRequestRequisitionLineInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type DeleteRequestLinesMutation = { __typename: 'Mutations', batchRequestRequisition: { __typename: 'BatchRequestRequisitionResponse', deleteRequestRequisitionLines?: Array<{ __typename: 'DeleteRequestRequisitionLineResponseWithId', id: string, response: { __typename: 'DeleteRequestRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type UseSuggestedQuantityMutationVariables = Types.Exact<{
  requestId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type UseSuggestedQuantityMutation = { __typename: 'Mutations', useSuggestedQuantity: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string }> } | { __typename: 'UseSuggestedQuantityError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type InsertRequestMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertRequestRequisitionInput;
}>;


export type InsertRequestMutation = { __typename: 'Mutations', insertRequestRequisition: { __typename: 'InsertRequestRequisitionError', error: { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'RequisitionNode', id: string, requisitionNumber: number } };

export type InsertProgramRequestMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertProgramRequestRequisitionInput;
}>;


export type InsertProgramRequestMutation = { __typename: 'Mutations', insertProgramRequestRequisition: { __typename: 'InsertProgramRequestRequisitionError' } | { __typename: 'RequisitionNode', id: string, requisitionNumber: number } };

export type UpdateRequestMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateRequestRequisitionInput;
}>;


export type UpdateRequestMutation = { __typename: 'Mutations', updateRequestRequisition: { __typename: 'RequisitionNode', id: string, requisitionNumber: number } | { __typename: 'UpdateRequestRequisitionError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type DeleteRequestMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchRequestRequisitionInput;
}>;


export type DeleteRequestMutation = { __typename: 'Mutations', batchRequestRequisition: { __typename: 'BatchRequestRequisitionResponse', deleteRequestRequisitions?: Array<{ __typename: 'DeleteRequestRequisitionResponseWithId', id: string, response: { __typename: 'DeleteRequestRequisitionError', error: { __typename: 'CannotDeleteRequisitionWithLines', description: string } | { __typename: 'CannotEditRequisition', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type ProgramSettingsFragment = { __typename: 'ProgramRequisitionSettingNode', programName: string, programId: string, suppliers: Array<{ __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }>, orderTypes: Array<{ __typename: 'ProgramRequisitionOrderTypeNode', id: string, name: string, availablePeriods: Array<{ __typename: 'PeriodNode', id: string, name: string }> }> };

export type ProgramSettingsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;


export type ProgramSettingsQuery = { __typename: 'Queries', programRequisitionSettings: Array<{ __typename: 'ProgramRequisitionSettingNode', programName: string, programId: string, suppliers: Array<{ __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }>, orderTypes: Array<{ __typename: 'ProgramRequisitionOrderTypeNode', id: string, name: string, availablePeriods: Array<{ __typename: 'PeriodNode', id: string, name: string }> }> }> };

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
  approvalStatus
  linkedRequisition {
    approvalStatus
  }
  programName
  period {
    name
    startDate
    endDate
  }
  orderType
}
    `;
export const ItemWithStatsFragmentDoc = gql`
    fragment ItemWithStats on ItemNode {
  id
  name
  code
  unitName
  defaultPackSize
  availableStockOnHand(storeId: $storeId)
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
  itemName
  itemStats {
    __typename
    availableStockOnHand
    availableMonthsOfStockOnHand
    averageMonthlyConsumption
  }
  linkedRequisitionLine {
    approvedQuantity
    approvalComment
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
  approvalStatus
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
  linkedRequisition {
    approvalStatus
  }
  programName
  period {
    name
    startDate
    endDate
  }
  orderType
}
    ${RequestLineFragmentDoc}`;
export const ConsumptionHistoryFragmentDoc = gql`
    fragment ConsumptionHistory on ConsumptionHistoryNode {
  averageMonthlyConsumption
  consumption
  date
  isCurrent
  isHistoric
}
    `;
export const ProgramSettingsFragmentDoc = gql`
    fragment ProgramSettings on ProgramRequisitionSettingNode {
  programName
  programId
  suppliers {
    ...NameRow
  }
  orderTypes {
    id
    name
    availablePeriods {
      id
      name
    }
  }
}
    ${NameRowFragmentDoc}`;
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
          ...ConsumptionHistory
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
    ${ConsumptionHistoryFragmentDoc}`;
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
export const InsertProgramRequestDocument = gql`
    mutation insertProgramRequest($storeId: String!, $input: InsertProgramRequestRequisitionInput!) {
  insertProgramRequestRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
      requisitionNumber
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
export const ProgramSettingsDocument = gql`
    query programSettings($storeId: String!) {
  programRequisitionSettings(storeId: $storeId) {
    ...ProgramSettings
  }
}
    ${ProgramSettingsFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    requestByNumber(variables: RequestByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<RequestByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequestByNumberQuery>(RequestByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'requestByNumber', 'query', variables);
    },
    requisitionLineChart(variables: RequisitionLineChartQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<RequisitionLineChartQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequisitionLineChartQuery>(RequisitionLineChartDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'requisitionLineChart', 'query', variables);
    },
    requests(variables: RequestsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<RequestsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequestsQuery>(RequestsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'requests', 'query', variables);
    },
    insertRequestLine(variables: InsertRequestLineMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertRequestLineMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertRequestLineMutation>(InsertRequestLineDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertRequestLine', 'mutation', variables);
    },
    updateRequestLine(variables: UpdateRequestLineMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateRequestLineMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateRequestLineMutation>(UpdateRequestLineDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateRequestLine', 'mutation', variables);
    },
    addFromMasterList(variables: AddFromMasterListMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AddFromMasterListMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<AddFromMasterListMutation>(AddFromMasterListDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'addFromMasterList', 'mutation', variables);
    },
    deleteRequestLines(variables: DeleteRequestLinesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteRequestLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteRequestLinesMutation>(DeleteRequestLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteRequestLines', 'mutation', variables);
    },
    useSuggestedQuantity(variables: UseSuggestedQuantityMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UseSuggestedQuantityMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UseSuggestedQuantityMutation>(UseSuggestedQuantityDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'useSuggestedQuantity', 'mutation', variables);
    },
    insertRequest(variables: InsertRequestMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertRequestMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertRequestMutation>(InsertRequestDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertRequest', 'mutation', variables);
    },
    insertProgramRequest(variables: InsertProgramRequestMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertProgramRequestMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertProgramRequestMutation>(InsertProgramRequestDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertProgramRequest', 'mutation', variables);
    },
    updateRequest(variables: UpdateRequestMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateRequestMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateRequestMutation>(UpdateRequestDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateRequest', 'mutation', variables);
    },
    deleteRequest(variables: DeleteRequestMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteRequestMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteRequestMutation>(DeleteRequestDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteRequest', 'mutation', variables);
    },
    programSettings(variables: ProgramSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ProgramSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramSettingsQuery>(ProgramSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programSettings', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;