import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { ReasonOptionRowFragmentDoc } from '../ReasonOption/api/operations.generated';
import { SyncFileReferenceFragmentDoc } from '../Documents/types.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ItemWithStatsFragment = {
  __typename: 'ItemNode';
  id: string;
  name: string;
  code: string;
  unitName?: string | null;
  defaultPackSize: number;
  isVaccine: boolean;
  doses: number;
  availableStockOnHand: number;
  stats: {
    __typename: 'ItemStatsNode';
    averageMonthlyConsumption: number;
    availableStockOnHand: number;
    availableMonthsOfStockOnHand?: number | null;
    totalConsumption: number;
    stockOnHand: number;
    monthsOfStockOnHand?: number | null;
  };
};

export type RequestLineFragment = {
  __typename: 'RequisitionLineNode';
  id: string;
  itemId: string;
  requestedQuantity: number;
  suggestedQuantity: number;
  comment?: string | null;
  itemName: string;
  requisitionNumber: number;
  initialStockOnHandUnits: number;
  incomingUnits: number;
  outgoingUnits: number;
  lossInUnits: number;
  additionInUnits: number;
  expiringUnits: number;
  daysOutOfStock: number;
  pricePerUnit?: number | null;
  itemStats: {
    __typename: 'ItemStatsNode';
    availableStockOnHand: number;
    availableMonthsOfStockOnHand?: number | null;
    averageMonthlyConsumption: number;
  };
  linkedRequisitionLine?: {
    __typename: 'RequisitionLineNode';
    approvedQuantity: number;
    approvalComment?: string | null;
  } | null;
  item: {
    __typename: 'ItemNode';
    id: string;
    name: string;
    code: string;
    unitName?: string | null;
    defaultPackSize: number;
    isVaccine: boolean;
    doses: number;
    availableStockOnHand: number;
    stats: {
      __typename: 'ItemStatsNode';
      averageMonthlyConsumption: number;
      availableStockOnHand: number;
      availableMonthsOfStockOnHand?: number | null;
      totalConsumption: number;
      stockOnHand: number;
      monthsOfStockOnHand?: number | null;
    };
  };
  reason?: {
    __typename: 'ReasonOptionNode';
    id: string;
    type: Types.ReasonOptionNodeType;
    reason: string;
    isActive: boolean;
  } | null;
};

export type RequestFragment = {
  __typename: 'RequisitionNode';
  id: string;
  type: Types.RequisitionNodeType;
  status: Types.RequisitionNodeStatus;
  createdDatetime: string;
  sentDatetime?: string | null;
  finalisedDatetime?: string | null;
  requisitionNumber: number;
  colour?: string | null;
  theirReference?: string | null;
  comment?: string | null;
  otherPartyName: string;
  otherPartyId: string;
  maxMonthsOfStock: number;
  minMonthsOfStock: number;
  approvalStatus: Types.RequisitionNodeApprovalStatus;
  programName?: string | null;
  orderType?: string | null;
  isEmergency: boolean;
  documents: {
    __typename: 'SyncFileReferenceConnector';
    nodes: Array<{
      __typename: 'SyncFileReferenceNode';
      id: string;
      fileName: string;
      recordId: string;
      createdDatetime: string;
    }>;
  };
  user?: {
    __typename: 'UserNode';
    username: string;
    email?: string | null;
  } | null;
  lines: {
    __typename: 'RequisitionLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'RequisitionLineNode';
      id: string;
      itemId: string;
      requestedQuantity: number;
      suggestedQuantity: number;
      comment?: string | null;
      itemName: string;
      requisitionNumber: number;
      initialStockOnHandUnits: number;
      incomingUnits: number;
      outgoingUnits: number;
      lossInUnits: number;
      additionInUnits: number;
      expiringUnits: number;
      daysOutOfStock: number;
      pricePerUnit?: number | null;
      itemStats: {
        __typename: 'ItemStatsNode';
        availableStockOnHand: number;
        availableMonthsOfStockOnHand?: number | null;
        averageMonthlyConsumption: number;
      };
      linkedRequisitionLine?: {
        __typename: 'RequisitionLineNode';
        approvedQuantity: number;
        approvalComment?: string | null;
      } | null;
      item: {
        __typename: 'ItemNode';
        id: string;
        name: string;
        code: string;
        unitName?: string | null;
        defaultPackSize: number;
        isVaccine: boolean;
        doses: number;
        availableStockOnHand: number;
        stats: {
          __typename: 'ItemStatsNode';
          averageMonthlyConsumption: number;
          availableStockOnHand: number;
          availableMonthsOfStockOnHand?: number | null;
          totalConsumption: number;
          stockOnHand: number;
          monthsOfStockOnHand?: number | null;
        };
      };
      reason?: {
        __typename: 'ReasonOptionNode';
        id: string;
        type: Types.ReasonOptionNodeType;
        reason: string;
        isActive: boolean;
      } | null;
    }>;
  };
  program?: { __typename: 'ProgramNode'; id: string } | null;
  shipments: {
    __typename: 'InvoiceConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'InvoiceNode';
      id: string;
      invoiceNumber: number;
      createdDatetime: string;
      user?: { __typename: 'UserNode'; username: string } | null;
    }>;
  };
  otherParty: {
    __typename: 'NameNode';
    id: string;
    code: string;
    isCustomer: boolean;
    isSupplier: boolean;
    isOnHold: boolean;
    name: string;
    margin?: number | null;
    store?: { __typename: 'StoreNode'; id: string; code: string } | null;
  };
  destinationCustomer?: {
    __typename: 'NameNode';
    id: string;
    code: string;
    isCustomer: boolean;
    isSupplier: boolean;
    isOnHold: boolean;
    name: string;
    store?: { __typename: 'StoreNode'; id: string; code: string } | null;
  } | null;
  linkedRequisition?: {
    __typename: 'RequisitionNode';
    approvalStatus: Types.RequisitionNodeApprovalStatus;
  } | null;
  period?: {
    __typename: 'PeriodNode';
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  createdFromRequisition?: {
    __typename: 'RequisitionNode';
    id: string;
    requisitionNumber: number;
    createdDatetime: string;
    user?: { __typename: 'UserNode'; username: string } | null;
  } | null;
};

export type OnlyHereToAvoidUnusedWarningsQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type OnlyHereToAvoidUnusedWarningsQuery = {
  __typename: 'Queries';
  me: { __typename: 'UserNode' };
};

export const ItemWithStatsFragmentDoc = gql`
  fragment ItemWithStats on ItemNode {
    id
    name
    code
    unitName
    defaultPackSize
    isVaccine
    doses
    availableStockOnHand(storeId: $storeId)
    stats(storeId: $storeId) {
      averageMonthlyConsumption
      availableStockOnHand
      availableMonthsOfStockOnHand
      totalConsumption
      stockOnHand
      monthsOfStockOnHand
    }
    isVaccine
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
    pricePerUnit
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
    reason {
      ...ReasonOptionRow
    }
  }
  ${ItemWithStatsFragmentDoc}
  ${ReasonOptionRowFragmentDoc}
`;
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
    documents {
      __typename
      nodes {
        ...SyncFileReference
      }
    }
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
    program {
      id
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
      margin
      store {
        id
        code
      }
    }
    destinationCustomer(storeId: $storeId) {
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
      id
      name
      startDate
      endDate
    }
    orderType
    isEmergency
    createdFromRequisition {
      id
      requisitionNumber
      createdDatetime
      user {
        __typename
        username
      }
    }
  }
  ${SyncFileReferenceFragmentDoc}
  ${RequestLineFragmentDoc}
`;
export const OnlyHereToAvoidUnusedWarningsDocument = gql`
  query OnlyHereToAvoidUnusedWarnings {
    me {
      __typename
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    OnlyHereToAvoidUnusedWarnings(
      variables?: OnlyHereToAvoidUnusedWarningsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<OnlyHereToAvoidUnusedWarningsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<OnlyHereToAvoidUnusedWarningsQuery>({
            document: OnlyHereToAvoidUnusedWarningsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'OnlyHereToAvoidUnusedWarnings',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
