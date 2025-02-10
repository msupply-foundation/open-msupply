import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { ReasonOptionRowFragmentDoc } from '../ReasonOption/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ItemWithStatsFragment = { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, totalConsumption: number, stockOnHand: number, monthsOfStockOnHand?: number | null } };

export type RequestRowFragment = { __typename: 'RequisitionNode', colour?: string | null, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, id: string, otherPartyName: string, requisitionNumber: number, sentDatetime?: string | null, status: Types.RequisitionNodeStatus, theirReference?: string | null, type: Types.RequisitionNodeType, otherPartyId: string, approvalStatus: Types.RequisitionNodeApprovalStatus, programName?: string | null, orderType?: string | null, linkedRequisition?: { __typename: 'RequisitionNode', approvalStatus: Types.RequisitionNodeApprovalStatus } | null, period?: { __typename: 'PeriodNode', id: string, name: string, startDate: string, endDate: string } | null, program?: { __typename: 'ProgramNode', id: string } | null };

export type ItemInformationFragment = { __typename: 'RequisitionItemInformationNode', id: string, adjustmentsInUnits: number, amcInUnits: number, outgoingUnits: number, dateRange?: string | null, stockInUnits: number, name: { __typename: 'NameNode', id: string, name: string } };

export type RequestLineFragment = { __typename: 'RequisitionLineNode', id: string, itemId: string, requestedQuantity: number, suggestedQuantity: number, comment?: string | null, itemName: string, requisitionNumber: number, initialStockOnHandUnits: number, incomingUnits: number, outgoingUnits: number, lossInUnits: number, additionInUnits: number, expiringUnits: number, daysOutOfStock: number, itemStats: { __typename: 'ItemStatsNode', availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, averageMonthlyConsumption: number }, linkedRequisitionLine?: { __typename: 'RequisitionLineNode', approvedQuantity: number, approvalComment?: string | null } | null, itemInformation?: Array<{ __typename: 'RequisitionItemInformationNode', id: string, adjustmentsInUnits: number, amcInUnits: number, outgoingUnits: number, dateRange?: string | null, stockInUnits: number, name: { __typename: 'NameNode', id: string, name: string } }> | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, totalConsumption: number, stockOnHand: number, monthsOfStockOnHand?: number | null } }, reason?: { __typename: 'ReasonOptionNode', id: string, type: Types.ReasonOptionNodeType, reason: string, isActive: boolean } | null };

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
    id
    name
    startDate
    endDate
  }
  program {
    id
  }
  orderType
}
    `;
export const ItemInformationFragmentDoc = gql`
    fragment itemInformation on RequisitionItemInformationNode {
  id
  adjustmentsInUnits
  amcInUnits
  name(storeId: $storeId) {
    id
    name
  }
  outgoingUnits
  dateRange
  stockInUnits
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
    totalConsumption
    stockOnHand
    monthsOfStockOnHand
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
  requisitionNumber
  initialStockOnHandUnits
  incomingUnits
  outgoingUnits
  lossInUnits
  additionInUnits
  expiringUnits
  daysOutOfStock
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
  itemInformation {
    __typename
    ...itemInformation
  }
  item {
    ...ItemWithStats
  }
  reason {
    ...ReasonOptionRow
  }
}
    ${ItemInformationFragmentDoc}
${ItemWithStatsFragmentDoc}
${ReasonOptionRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {

  };
}
export type Sdk = ReturnType<typeof getSdk>;