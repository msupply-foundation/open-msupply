import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { RequisitionReasonsNotProvidedErrorFragmentDoc, OrderTypeRowFragmentDoc, ProgramIndicatorFragmentDoc } from '../../RequestRequisition/api/operations.generated';
import { ItemRowFragmentDoc } from '../../../../system/src/Item/api/operations.generated';
import { ReasonOptionRowFragmentDoc } from '../../../../system/src/ReasonOption/api/operations.generated';
import { NameRowFragmentDoc } from '../../../../system/src/Name/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type UpdateResponseMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateResponseRequisitionInput;
}>;


export type UpdateResponseMutation = { __typename: 'Mutations', updateResponseRequisition: { __typename: 'RequisitionNode', id: string } | { __typename: 'UpdateResponseRequisitionError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'OrderingTooManyItems', description: string, maxItemsInEmergencyOrder: number } | { __typename: 'RecordNotFound', description: string } | { __typename: 'RequisitionReasonsNotProvided', description: string, errors: Array<{ __typename: 'RequisitionReasonNotProvided', description: string, requisitionLine: { __typename: 'RequisitionLineNode', id: string } }> } } };

export type DeleteRequestMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchResponseRequisitionInput;
}>;


export type DeleteRequestMutation = { __typename: 'Mutations', batchResponseRequisition: { __typename: 'BatchResponseRequisitionResponse', deleteResponseRequisitions?: Array<{ __typename: 'DeleteResponseRequisitionResponseWithId', id: string, response: { __typename: 'DeleteResponse', id: string } | { __typename: 'DeleteResponseRequisitionError', error: { __typename: 'FinalisedRequisition', description: string } | { __typename: 'LineDeleteError', description: string } | { __typename: 'RecordNotFound', description: string } | { __typename: 'RequisitionWithShipment', description: string } | { __typename: 'TransferredRequisition', description: string } } }> | null } };

export type ResponseLineFragment = { __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, supplyQuantity: number, remainingQuantityToSupply: number, alreadyIssued: number, comment?: string | null, averageMonthlyConsumption: number, availableStockOnHand: number, initialStockOnHandUnits: number, incomingUnits: number, outgoingUnits: number, lossInUnits: number, additionInUnits: number, expiringUnits: number, daysOutOfStock: number, optionId?: string | null, suggestedQuantity: number, requisitionNumber: number, approvedQuantity: number, approvalComment?: string | null, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null }, linkedRequisitionLine?: { __typename: 'RequisitionLineNode', itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, averageMonthlyConsumption: number, availableMonthsOfStockOnHand?: number | null } } | null, reason?: { __typename: 'ReasonOptionNode', id: string, type: Types.ReasonOptionNodeType, reason: string, isActive: boolean } | null };

export type ResponseFragment = { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, minMonthsOfStock: number, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, shipments: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null }> }, linesRemainingToSupply: { __typename: 'RequisitionLineConnector', totalCount: number }, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, supplyQuantity: number, remainingQuantityToSupply: number, alreadyIssued: number, comment?: string | null, averageMonthlyConsumption: number, availableStockOnHand: number, initialStockOnHandUnits: number, incomingUnits: number, outgoingUnits: number, lossInUnits: number, additionInUnits: number, expiringUnits: number, daysOutOfStock: number, optionId?: string | null, suggestedQuantity: number, requisitionNumber: number, approvedQuantity: number, approvalComment?: string | null, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null }, linkedRequisitionLine?: { __typename: 'RequisitionLineNode', itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, averageMonthlyConsumption: number, availableMonthsOfStockOnHand?: number | null } } | null, reason?: { __typename: 'ReasonOptionNode', id: string, type: Types.ReasonOptionNodeType, reason: string, isActive: boolean } | null }> }, otherParty: { __typename: 'NameNode', id: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }, program?: { __typename: 'ProgramNode', id: string, name: string } | null, period?: { __typename: 'PeriodNode', id: string, name: string, startDate: string, endDate: string } | null, linkedRequisition?: { __typename: 'RequisitionNode', id: string } | null };

export type ResponseByNumberQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requisitionNumber: Types.Scalars['Int']['input'];
}>;


export type ResponseByNumberQuery = { __typename: 'Queries', requisitionByNumber: { __typename: 'RecordNotFound' } | { __typename: 'RequisitionNode', id: string, type: Types.RequisitionNodeType, status: Types.RequisitionNodeStatus, createdDatetime: string, sentDatetime?: string | null, finalisedDatetime?: string | null, requisitionNumber: number, colour?: string | null, theirReference?: string | null, comment?: string | null, otherPartyName: string, otherPartyId: string, maxMonthsOfStock: number, minMonthsOfStock: number, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, shipments: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null }> }, linesRemainingToSupply: { __typename: 'RequisitionLineConnector', totalCount: number }, lines: { __typename: 'RequisitionLineConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, supplyQuantity: number, remainingQuantityToSupply: number, alreadyIssued: number, comment?: string | null, averageMonthlyConsumption: number, availableStockOnHand: number, initialStockOnHandUnits: number, incomingUnits: number, outgoingUnits: number, lossInUnits: number, additionInUnits: number, expiringUnits: number, daysOutOfStock: number, optionId?: string | null, suggestedQuantity: number, requisitionNumber: number, approvedQuantity: number, approvalComment?: string | null, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null }, linkedRequisitionLine?: { __typename: 'RequisitionLineNode', itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, averageMonthlyConsumption: number, availableMonthsOfStockOnHand?: number | null } } | null, reason?: { __typename: 'ReasonOptionNode', id: string, type: Types.ReasonOptionNodeType, reason: string, isActive: boolean } | null }> }, otherParty: { __typename: 'NameNode', id: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }, program?: { __typename: 'ProgramNode', id: string, name: string } | null, period?: { __typename: 'PeriodNode', id: string, name: string, startDate: string, endDate: string } | null, linkedRequisition?: { __typename: 'RequisitionNode', id: string } | null } };

export type ResponseRowFragment = { __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, period?: { __typename: 'PeriodNode', name: string, startDate: string, endDate: string } | null, shipments: { __typename: 'InvoiceConnector', totalCount: number } };

export type ResponsesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.RequisitionFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.RequisitionSortInput> | Types.RequisitionSortInput>;
}>;


export type ResponsesQuery = { __typename: 'Queries', requisitions: { __typename: 'RequisitionConnector', totalCount: number, nodes: Array<{ __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, period?: { __typename: 'PeriodNode', name: string, startDate: string, endDate: string } | null, shipments: { __typename: 'InvoiceConnector', totalCount: number } }> } };

export type InsertResponseMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertResponseRequisitionInput;
}>;


export type InsertResponseMutation = { __typename: 'Mutations', insertResponseRequisition: { __typename: 'InsertResponseRequisitionError', error: { __typename: 'OtherPartyNotACustomer', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'RequisitionNode', id: string, requisitionNumber: number } };

export type InsertProgramResponseMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertProgramResponseRequisitionInput;
}>;


export type InsertProgramResponseMutation = { __typename: 'Mutations', insertProgramResponseRequisition: { __typename: 'InsertProgramResponseRequisitionError' } | { __typename: 'RequisitionNode', id: string, requisitionNumber: number } };

export type InsertResponseLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertResponseRequisitionLineInput;
}>;


export type InsertResponseLineMutation = { __typename: 'Mutations', insertResponseRequisitionLine: { __typename: 'InsertResponseRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RequisitionLineWithItemIdExists', description: string } } | { __typename: 'RequisitionLineNode', id: string } };

export type UpdateResponseLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateResponseRequisitionLineInput;
}>;


export type UpdateResponseLineMutation = { __typename: 'Mutations', updateResponseRequisitionLine: { __typename: 'RequisitionLineNode', id: string } | { __typename: 'UpdateResponseRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } };

export type DeleteResponseLinesMutationVariables = Types.Exact<{
  ids?: Types.InputMaybe<Array<Types.DeleteResponseRequisitionLineInput> | Types.DeleteResponseRequisitionLineInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type DeleteResponseLinesMutation = { __typename: 'Mutations', batchResponseRequisition: { __typename: 'BatchResponseRequisitionResponse', deleteResponseRequisitionLines?: Array<{ __typename: 'DeleteResponseRequisitionLineResponseWithId', id: string, response: { __typename: 'DeleteResponse', id: string } | { __typename: 'DeleteResponseRequisitionLineError', error: { __typename: 'CannotEditRequisition', description: string } | { __typename: 'ForeignKeyError', description: string } | { __typename: 'RecordNotFound', description: string } } }> | null } };

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

export type CustomerProgramSettingsFragment = { __typename: 'CustomerProgramRequisitionSettingNode', programName: string, programId: string, customerAndOrderTypes: Array<{ __typename: 'CustomerAndOrderTypeNode', customer: { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }, orderTypes: Array<{ __typename: 'ProgramRequisitionOrderTypeNode', id: string, name: string, isEmergency: boolean, availablePeriods: Array<{ __typename: 'PeriodNode', id: string, name: string }> }> }> };

export type CustomerProgramSettingsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;


export type CustomerProgramSettingsQuery = { __typename: 'Queries', customerProgramRequisitionSettings: Array<{ __typename: 'CustomerProgramRequisitionSettingNode', programName: string, programId: string, customerAndOrderTypes: Array<{ __typename: 'CustomerAndOrderTypeNode', customer: { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }, orderTypes: Array<{ __typename: 'ProgramRequisitionOrderTypeNode', id: string, name: string, isEmergency: boolean, availablePeriods: Array<{ __typename: 'PeriodNode', id: string, name: string }> }> }> }> };

export type ProgramIndicatorsQueryVariables = Types.Exact<{
  customerNameLinkId: Types.Scalars['String']['input'];
  periodId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
  programId: Types.Scalars['String']['input'];
}>;


export type ProgramIndicatorsQuery = { __typename: 'Queries', programIndicators: { __typename: 'ProgramIndicatorConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramIndicatorNode', code?: string | null, id: string, lineAndColumns: Array<{ __typename: 'IndicatorLineNode', columns: Array<{ __typename: 'IndicatorColumnNode', columnNumber: number, name: string, valueType?: Types.IndicatorValueTypeNode | null, value?: { __typename: 'IndicatorValueNode', id: string, value: string } | null }>, line: { __typename: 'IndicatorLineRowNode', id: string, code: string, lineNumber: number, name: string, valueType?: Types.IndicatorValueTypeNode | null } }> }> } };

export type UpdateIndicatorValueMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateIndicatorValueInput;
}>;


export type UpdateIndicatorValueMutation = { __typename: 'Mutations', updateIndicatorValue: { __typename: 'IndicatorValueNode', id: string, value: string } | { __typename: 'UpdateIndicatorValueError', error: { __typename: 'RecordNotFound', description: string } | { __typename: 'ValueTypeNotCorrect', description: string } } };

export const ResponseLineFragmentDoc = gql`
    fragment ResponseLine on RequisitionLineNode {
  id
  itemId
  requestedQuantity
  supplyQuantity
  remainingQuantityToSupply
  alreadyIssued
  comment
  averageMonthlyConsumption
  availableStockOnHand
  initialStockOnHandUnits
  incomingUnits
  outgoingUnits
  lossInUnits
  additionInUnits
  expiringUnits
  daysOutOfStock
  optionId
  suggestedQuantity
  availableStockOnHand
  requisitionNumber
  itemStats {
    __typename
    availableStockOnHand
    availableMonthsOfStockOnHand
    averageMonthlyConsumption
  }
  item {
    ...ItemRow
  }
  approvedQuantity
  approvalComment
  linkedRequisitionLine {
    itemStats {
      availableStockOnHand
      averageMonthlyConsumption
      availableMonthsOfStockOnHand
    }
  }
  reason {
    ...ReasonOptionRow
  }
}
    ${ItemRowFragmentDoc}
${ReasonOptionRowFragmentDoc}`;
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
  program {
    id
    name
  }
  period {
    id
    name
    startDate
    endDate
  }
  linkedRequisition {
    id
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
  period {
    name
    startDate
    endDate
  }
  orderType
  shipments {
    __typename
    totalCount
  }
}
    `;
export const CustomerProgramSettingsFragmentDoc = gql`
    fragment CustomerProgramSettings on CustomerProgramRequisitionSettingNode {
  programName
  programId
  customerAndOrderTypes {
    customer {
      ...NameRow
    }
    orderTypes {
      ...OrderTypeRow
    }
  }
}
    ${NameRowFragmentDoc}
${OrderTypeRowFragmentDoc}`;
export const UpdateResponseDocument = gql`
    mutation updateResponse($storeId: String!, $input: UpdateResponseRequisitionInput!) {
  updateResponseRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
    }
    ... on UpdateResponseRequisitionError {
      __typename
      error {
        description
        ... on RequisitionReasonsNotProvided {
          ...RequisitionReasonsNotProvidedError
        }
        ... on OrderingTooManyItems {
          __typename
          description
          maxItemsInEmergencyOrder
        }
      }
    }
  }
}
    ${RequisitionReasonsNotProvidedErrorFragmentDoc}`;
export const DeleteRequestDocument = gql`
    mutation deleteRequest($storeId: String!, $input: BatchResponseRequisitionInput!) {
  batchResponseRequisition(storeId: $storeId, input: $input) {
    deleteResponseRequisitions {
      id
      response {
        ... on DeleteResponseRequisitionError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on FinalisedRequisition {
              __typename
              description
            }
            ... on TransferredRequisition {
              __typename
              description
            }
            ... on RequisitionWithShipment {
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
export const InsertResponseDocument = gql`
    mutation insertResponse($storeId: String!, $input: InsertResponseRequisitionInput!) {
  insertResponseRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
      requisitionNumber
    }
    ... on InsertResponseRequisitionError {
      __typename
      error {
        description
        ... on OtherPartyNotACustomer {
          __typename
          description
        }
        ... on OtherPartyNotVisible {
          __typename
          description
        }
      }
    }
  }
}
    `;
export const InsertProgramResponseDocument = gql`
    mutation insertProgramResponse($storeId: String!, $input: InsertProgramResponseRequisitionInput!) {
  insertProgramResponseRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
      requisitionNumber
    }
  }
}
    `;
export const InsertResponseLineDocument = gql`
    mutation insertResponseLine($storeId: String!, $input: InsertResponseRequisitionLineInput!) {
  insertResponseRequisitionLine(input: $input, storeId: $storeId) {
    ... on RequisitionLineNode {
      __typename
      id
    }
    ... on InsertResponseRequisitionLineError {
      __typename
      error {
        description
        ... on RequisitionLineWithItemIdExists {
          __typename
          description
        }
        ... on CannotEditRequisition {
          __typename
          description
        }
        ... on ForeignKeyError {
          __typename
          description
          key
        }
      }
    }
  }
}
    `;
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
export const DeleteResponseLinesDocument = gql`
    mutation deleteResponseLines($ids: [DeleteResponseRequisitionLineInput!], $storeId: String!) {
  batchResponseRequisition(
    input: {deleteResponseRequisitionLines: $ids}
    storeId: $storeId
  ) {
    deleteResponseRequisitionLines {
      id
      response {
        ... on DeleteResponseRequisitionLineError {
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
export const CustomerProgramSettingsDocument = gql`
    query customerProgramSettings($storeId: String!) {
  customerProgramRequisitionSettings(storeId: $storeId) {
    ...CustomerProgramSettings
  }
}
    ${CustomerProgramSettingsFragmentDoc}`;
export const ProgramIndicatorsDocument = gql`
    query programIndicators($customerNameLinkId: String!, $periodId: String!, $storeId: String!, $programId: String!) {
  programIndicators(storeId: $storeId, filter: {programId: {equalTo: $programId}}) {
    ... on ProgramIndicatorConnector {
      __typename
      nodes {
        ...ProgramIndicator
      }
      totalCount
    }
  }
}
    ${ProgramIndicatorFragmentDoc}`;
export const UpdateIndicatorValueDocument = gql`
    mutation updateIndicatorValue($storeId: String!, $input: UpdateIndicatorValueInput!) {
  updateIndicatorValue(input: $input, storeId: $storeId) {
    __typename
    ... on IndicatorValueNode {
      id
      value
    }
    ... on UpdateIndicatorValueError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on ValueTypeNotCorrect {
          __typename
          description
        }
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    updateResponse(variables: UpdateResponseMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateResponseMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateResponseMutation>(UpdateResponseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateResponse', 'mutation', variables);
    },
    deleteRequest(variables: DeleteRequestMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteRequestMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteRequestMutation>(DeleteRequestDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteRequest', 'mutation', variables);
    },
    responseByNumber(variables: ResponseByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ResponseByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ResponseByNumberQuery>(ResponseByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'responseByNumber', 'query', variables);
    },
    responses(variables: ResponsesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ResponsesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ResponsesQuery>(ResponsesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'responses', 'query', variables);
    },
    insertResponse(variables: InsertResponseMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertResponseMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertResponseMutation>(InsertResponseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertResponse', 'mutation', variables);
    },
    insertProgramResponse(variables: InsertProgramResponseMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertProgramResponseMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertProgramResponseMutation>(InsertProgramResponseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertProgramResponse', 'mutation', variables);
    },
    insertResponseLine(variables: InsertResponseLineMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertResponseLineMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertResponseLineMutation>(InsertResponseLineDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertResponseLine', 'mutation', variables);
    },
    updateResponseLine(variables: UpdateResponseLineMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateResponseLineMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateResponseLineMutation>(UpdateResponseLineDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateResponseLine', 'mutation', variables);
    },
    deleteResponseLines(variables: DeleteResponseLinesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteResponseLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteResponseLinesMutation>(DeleteResponseLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteResponseLines', 'mutation', variables);
    },
    createOutboundFromResponse(variables: CreateOutboundFromResponseMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CreateOutboundFromResponseMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateOutboundFromResponseMutation>(CreateOutboundFromResponseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'createOutboundFromResponse', 'mutation', variables);
    },
    supplyRequestedQuantity(variables: SupplyRequestedQuantityMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SupplyRequestedQuantityMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SupplyRequestedQuantityMutation>(SupplyRequestedQuantityDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'supplyRequestedQuantity', 'mutation', variables);
    },
    responseRequisitionStats(variables: ResponseRequisitionStatsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ResponseRequisitionStatsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ResponseRequisitionStatsQuery>(ResponseRequisitionStatsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'responseRequisitionStats', 'query', variables);
    },
    customerProgramSettings(variables: CustomerProgramSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CustomerProgramSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<CustomerProgramSettingsQuery>(CustomerProgramSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'customerProgramSettings', 'query', variables);
    },
    programIndicators(variables: ProgramIndicatorsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ProgramIndicatorsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramIndicatorsQuery>(ProgramIndicatorsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programIndicators', 'query', variables);
    },
    updateIndicatorValue(variables: UpdateIndicatorValueMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateIndicatorValueMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateIndicatorValueMutation>(UpdateIndicatorValueDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateIndicatorValue', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;