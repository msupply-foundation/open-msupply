import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import {
  RequisitionReasonsNotProvidedErrorFragmentDoc,
  ProgramIndicatorFragmentDoc,
} from '../../RequestRequisition/api/operations.generated';
import { ItemWithStatsFragmentDoc } from '../../../../system/src/RequestRequisitionLine/operations.generated';
import { ReasonOptionRowFragmentDoc } from '../../../../system/src/ReasonOption/api/operations.generated';
import { SyncFileReferenceFragmentDoc } from '../../../../system/src/Documents/types.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type UpdateResponseMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateResponseRequisitionInput;
}>;

export type UpdateResponseMutation = {
  __typename: 'Mutations';
  updateResponseRequisition:
    | { __typename: 'RequisitionNode'; id: string }
    | {
        __typename: 'UpdateResponseRequisitionError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | {
              __typename: 'OrderingTooManyItems';
              description: string;
              maxItemsInEmergencyOrder: number;
            }
          | { __typename: 'RecordNotFound'; description: string }
          | {
              __typename: 'RequisitionReasonsNotProvided';
              description: string;
              errors: Array<{
                __typename: 'RequisitionReasonNotProvided';
                description: string;
                requisitionLine: {
                  __typename: 'RequisitionLineNode';
                  id: string;
                };
              }>;
            };
      };
};

export type DeleteResponseMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchResponseRequisitionInput;
}>;

export type DeleteResponseMutation = {
  __typename: 'Mutations';
  batchResponseRequisition: {
    __typename: 'BatchResponseRequisitionResponse';
    deleteResponseRequisitions?: Array<{
      __typename: 'DeleteResponseRequisitionResponseWithId';
      id: string;
      response:
        | { __typename: 'DeleteResponse'; id: string }
        | {
            __typename: 'DeleteResponseRequisitionError';
            error:
              | { __typename: 'FinalisedRequisition'; description: string }
              | { __typename: 'LineDeleteError'; description: string }
              | { __typename: 'RecordNotFound'; description: string }
              | { __typename: 'RequisitionWithShipment'; description: string }
              | { __typename: 'TransferredRequisition'; description: string };
          };
    }> | null;
  };
};

export type ResponseLineFragment = {
  __typename: 'RequisitionLineNode';
  id: string;
  itemId: string;
  itemName: string;
  requestedQuantity: number;
  pricePerUnit?: number | null;
  supplyQuantity: number;
  remainingQuantityToSupply: number;
  alreadyIssued: number;
  comment?: string | null;
  averageMonthlyConsumption: number;
  availableStockOnHand: number;
  initialStockOnHandUnits: number;
  incomingUnits: number;
  outgoingUnits: number;
  lossInUnits: number;
  additionInUnits: number;
  expiringUnits: number;
  daysOutOfStock: number;
  optionId?: string | null;
  suggestedQuantity: number;
  requisitionNumber: number;
  requisitionId: string;
  approvedQuantity: number;
  approvalComment?: string | null;
  itemStats: {
    __typename: 'ItemStatsNode';
    stockOnHand: number;
    availableMonthsOfStockOnHand?: number | null;
    averageMonthlyConsumption: number;
  };
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
  linkedRequisitionLine?: {
    __typename: 'RequisitionLineNode';
    itemStats: {
      __typename: 'ItemStatsNode';
      availableStockOnHand: number;
      averageMonthlyConsumption: number;
      availableMonthsOfStockOnHand?: number | null;
    };
  } | null;
  reason?: {
    __typename: 'ReasonOptionNode';
    id: string;
    type: Types.ReasonOptionNodeType;
    reason: string;
    isActive: boolean;
  } | null;
};

export type ResponseFragment = {
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
  linesRemainingToSupply: {
    __typename: 'RequisitionLineConnector';
    totalCount: number;
  };
  lines: {
    __typename: 'RequisitionLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'RequisitionLineNode';
      id: string;
      itemId: string;
      itemName: string;
      requestedQuantity: number;
      pricePerUnit?: number | null;
      supplyQuantity: number;
      remainingQuantityToSupply: number;
      alreadyIssued: number;
      comment?: string | null;
      averageMonthlyConsumption: number;
      availableStockOnHand: number;
      initialStockOnHandUnits: number;
      incomingUnits: number;
      outgoingUnits: number;
      lossInUnits: number;
      additionInUnits: number;
      expiringUnits: number;
      daysOutOfStock: number;
      optionId?: string | null;
      suggestedQuantity: number;
      requisitionNumber: number;
      requisitionId: string;
      approvedQuantity: number;
      approvalComment?: string | null;
      itemStats: {
        __typename: 'ItemStatsNode';
        stockOnHand: number;
        availableMonthsOfStockOnHand?: number | null;
        averageMonthlyConsumption: number;
      };
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
      linkedRequisitionLine?: {
        __typename: 'RequisitionLineNode';
        itemStats: {
          __typename: 'ItemStatsNode';
          availableStockOnHand: number;
          averageMonthlyConsumption: number;
          availableMonthsOfStockOnHand?: number | null;
        };
      } | null;
      reason?: {
        __typename: 'ReasonOptionNode';
        id: string;
        type: Types.ReasonOptionNodeType;
        reason: string;
        isActive: boolean;
      } | null;
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
  program?: { __typename: 'ProgramNode'; id: string; name: string } | null;
  period?: {
    __typename: 'PeriodNode';
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  linkedRequisition?: { __typename: 'RequisitionNode'; id: string } | null;
};

export type ResponseByNumberQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requisitionNumber: Types.Scalars['Int']['input'];
}>;

export type ResponseByNumberQuery = {
  __typename: 'Queries';
  requisitionByNumber:
    | { __typename: 'RecordNotFound' }
    | {
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
        linesRemainingToSupply: {
          __typename: 'RequisitionLineConnector';
          totalCount: number;
        };
        lines: {
          __typename: 'RequisitionLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'RequisitionLineNode';
            id: string;
            itemId: string;
            itemName: string;
            requestedQuantity: number;
            pricePerUnit?: number | null;
            supplyQuantity: number;
            remainingQuantityToSupply: number;
            alreadyIssued: number;
            comment?: string | null;
            averageMonthlyConsumption: number;
            availableStockOnHand: number;
            initialStockOnHandUnits: number;
            incomingUnits: number;
            outgoingUnits: number;
            lossInUnits: number;
            additionInUnits: number;
            expiringUnits: number;
            daysOutOfStock: number;
            optionId?: string | null;
            suggestedQuantity: number;
            requisitionNumber: number;
            requisitionId: string;
            approvedQuantity: number;
            approvalComment?: string | null;
            itemStats: {
              __typename: 'ItemStatsNode';
              stockOnHand: number;
              availableMonthsOfStockOnHand?: number | null;
              averageMonthlyConsumption: number;
            };
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
            linkedRequisitionLine?: {
              __typename: 'RequisitionLineNode';
              itemStats: {
                __typename: 'ItemStatsNode';
                availableStockOnHand: number;
                averageMonthlyConsumption: number;
                availableMonthsOfStockOnHand?: number | null;
              };
            } | null;
            reason?: {
              __typename: 'ReasonOptionNode';
              id: string;
              type: Types.ReasonOptionNodeType;
              reason: string;
              isActive: boolean;
            } | null;
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
        program?: {
          __typename: 'ProgramNode';
          id: string;
          name: string;
        } | null;
        period?: {
          __typename: 'PeriodNode';
          id: string;
          name: string;
          startDate: string;
          endDate: string;
        } | null;
        linkedRequisition?: {
          __typename: 'RequisitionNode';
          id: string;
        } | null;
      };
};

export type ResponseByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requisitionId: Types.Scalars['String']['input'];
}>;

export type ResponseByIdQuery = {
  __typename: 'Queries';
  requisition:
    | { __typename: 'RecordNotFound' }
    | {
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
        linesRemainingToSupply: {
          __typename: 'RequisitionLineConnector';
          totalCount: number;
        };
        lines: {
          __typename: 'RequisitionLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'RequisitionLineNode';
            id: string;
            itemId: string;
            itemName: string;
            requestedQuantity: number;
            pricePerUnit?: number | null;
            supplyQuantity: number;
            remainingQuantityToSupply: number;
            alreadyIssued: number;
            comment?: string | null;
            averageMonthlyConsumption: number;
            availableStockOnHand: number;
            initialStockOnHandUnits: number;
            incomingUnits: number;
            outgoingUnits: number;
            lossInUnits: number;
            additionInUnits: number;
            expiringUnits: number;
            daysOutOfStock: number;
            optionId?: string | null;
            suggestedQuantity: number;
            requisitionNumber: number;
            requisitionId: string;
            approvedQuantity: number;
            approvalComment?: string | null;
            itemStats: {
              __typename: 'ItemStatsNode';
              stockOnHand: number;
              availableMonthsOfStockOnHand?: number | null;
              averageMonthlyConsumption: number;
            };
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
            linkedRequisitionLine?: {
              __typename: 'RequisitionLineNode';
              itemStats: {
                __typename: 'ItemStatsNode';
                availableStockOnHand: number;
                averageMonthlyConsumption: number;
                availableMonthsOfStockOnHand?: number | null;
              };
            } | null;
            reason?: {
              __typename: 'ReasonOptionNode';
              id: string;
              type: Types.ReasonOptionNodeType;
              reason: string;
              isActive: boolean;
            } | null;
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
        program?: {
          __typename: 'ProgramNode';
          id: string;
          name: string;
        } | null;
        period?: {
          __typename: 'PeriodNode';
          id: string;
          name: string;
          startDate: string;
          endDate: string;
        } | null;
        linkedRequisition?: {
          __typename: 'RequisitionNode';
          id: string;
        } | null;
      };
};

export type ResponseRowFragment = {
  __typename: 'RequisitionNode';
  colour?: string | null;
  comment?: string | null;
  createdDatetime: string;
  finalisedDatetime?: string | null;
  id: string;
  otherPartyName: string;
  requisitionNumber: number;
  sentDatetime?: string | null;
  status: Types.RequisitionNodeStatus;
  theirReference?: string | null;
  type: Types.RequisitionNodeType;
  otherPartyId: string;
  approvalStatus: Types.RequisitionNodeApprovalStatus;
  programName?: string | null;
  maxMonthsOfStock: number;
  minMonthsOfStock: number;
  orderType?: string | null;
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
  period?: {
    __typename: 'PeriodNode';
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  shipments: { __typename: 'InvoiceConnector'; totalCount: number };
};

export type ResponsesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.RequisitionFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<
    Array<Types.RequisitionSortInput> | Types.RequisitionSortInput
  >;
}>;

export type ResponsesQuery = {
  __typename: 'Queries';
  requisitions: {
    __typename: 'RequisitionConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'RequisitionNode';
      colour?: string | null;
      comment?: string | null;
      createdDatetime: string;
      finalisedDatetime?: string | null;
      id: string;
      otherPartyName: string;
      requisitionNumber: number;
      sentDatetime?: string | null;
      status: Types.RequisitionNodeStatus;
      theirReference?: string | null;
      type: Types.RequisitionNodeType;
      otherPartyId: string;
      approvalStatus: Types.RequisitionNodeApprovalStatus;
      programName?: string | null;
      maxMonthsOfStock: number;
      minMonthsOfStock: number;
      orderType?: string | null;
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
      period?: {
        __typename: 'PeriodNode';
        name: string;
        startDate: string;
        endDate: string;
      } | null;
      shipments: { __typename: 'InvoiceConnector'; totalCount: number };
    }>;
  };
};

export type InsertResponseMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertResponseRequisitionInput;
}>;

export type InsertResponseMutation = {
  __typename: 'Mutations';
  insertResponseRequisition:
    | {
        __typename: 'InsertResponseRequisitionError';
        error:
          | { __typename: 'OtherPartyNotACustomer'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string };
      }
    | { __typename: 'RequisitionNode'; id: string };
};

export type InsertProgramResponseMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertProgramResponseRequisitionInput;
}>;

export type InsertProgramResponseMutation = {
  __typename: 'Mutations';
  insertProgramResponseRequisition:
    | {
        __typename: 'InsertProgramResponseRequisitionError';
        error: { __typename: 'MaxOrdersReachedForPeriod'; description: string };
      }
    | { __typename: 'RequisitionNode'; id: string };
};

export type InsertResponseLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertResponseRequisitionLineInput;
}>;

export type InsertResponseLineMutation = {
  __typename: 'Mutations';
  insertResponseRequisitionLine:
    | {
        __typename: 'InsertResponseRequisitionLineError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | {
              __typename: 'ForeignKeyError';
              description: string;
              key: Types.ForeignKey;
            }
          | {
              __typename: 'RequisitionLineWithItemIdExists';
              description: string;
            };
      }
    | { __typename: 'RequisitionLineNode'; id: string };
};

export type UpdateResponseLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateResponseRequisitionLineInput;
}>;

export type UpdateResponseLineMutation = {
  __typename: 'Mutations';
  updateResponseRequisitionLine:
    | { __typename: 'RequisitionLineNode'; id: string }
    | {
        __typename: 'UpdateResponseRequisitionLineError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | {
              __typename: 'ForeignKeyError';
              description: string;
              key: Types.ForeignKey;
            }
          | { __typename: 'RecordNotFound'; description: string }
          | { __typename: 'RequisitionReasonNotProvided'; description: string };
      };
};

export type CannotDeleteLineLinkedToShipmentErrorFragment = {
  __typename: 'CannotDeleteLineLinkedToShipment';
};

export type DeleteResponseLinesMutationVariables = Types.Exact<{
  ids?: Types.InputMaybe<
    | Array<Types.DeleteResponseRequisitionLineInput>
    | Types.DeleteResponseRequisitionLineInput
  >;
  storeId: Types.Scalars['String']['input'];
}>;

export type DeleteResponseLinesMutation = {
  __typename: 'Mutations';
  batchResponseRequisition: {
    __typename: 'BatchResponseRequisitionResponse';
    deleteResponseRequisitionLines?: Array<{
      __typename: 'DeleteResponseRequisitionLineResponseWithId';
      id: string;
      response:
        | { __typename: 'DeleteResponse'; id: string }
        | {
            __typename: 'DeleteResponseRequisitionLineError';
            error:
              | {
                  __typename: 'CannotDeleteLineLinkedToShipment';
                  description: string;
                }
              | { __typename: 'CannotEditRequisition'; description: string }
              | { __typename: 'ForeignKeyError'; description: string }
              | { __typename: 'RecordNotFound'; description: string };
          };
    }> | null;
  };
};

export type CreateOutboundFromResponseMutationVariables = Types.Exact<{
  responseId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type CreateOutboundFromResponseMutation = {
  __typename: 'Mutations';
  createRequisitionShipment:
    | {
        __typename: 'CreateRequisitionShipmentError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'NothingRemainingToSupply'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | { __typename: 'InvoiceNode'; id: string; invoiceNumber: number };
};

export type ResponseAddFromMasterListMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  responseId: Types.Scalars['String']['input'];
  masterListId: Types.Scalars['String']['input'];
}>;

export type ResponseAddFromMasterListMutation = {
  __typename: 'Mutations';
  responseAddFromMasterList:
    | { __typename: 'RequisitionLineConnector'; totalCount: number }
    | {
        __typename: 'ResponseAddFromMasterListError';
        error: {
          __typename: 'MasterListNotFoundForThisStore';
          description: string;
        };
      };
};

export type SupplyRequestedQuantityMutationVariables = Types.Exact<{
  responseId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type SupplyRequestedQuantityMutation = {
  __typename: 'Mutations';
  supplyRequestedQuantity:
    | {
        __typename: 'RequisitionLineConnector';
        nodes: Array<{ __typename: 'RequisitionLineNode'; id: string }>;
      }
    | {
        __typename: 'SupplyRequestedQuantityError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export type ResponseRequisitionStatsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requisitionLineId: Types.Scalars['String']['input'];
}>;

export type ResponseRequisitionStatsQuery = {
  __typename: 'Queries';
  responseRequisitionStats:
    | {
        __typename: 'RequisitionLineStatsError';
        error: { __typename: 'RecordNotFound'; description: string };
      }
    | {
        __typename: 'ResponseRequisitionStatsNode';
        requestStoreStats: {
          __typename: 'RequestStoreStatsNode';
          averageMonthlyConsumption: number;
          stockOnHand: number;
          maxMonthsOfStock: number;
          suggestedQuantity: number;
        };
        responseStoreStats: {
          __typename: 'ResponseStoreStatsNode';
          incomingStock: number;
          otherRequestedQuantity: number;
          requestedQuantity: number;
          stockOnHand: number;
          stockOnOrder: number;
        };
      };
};

export type AvailablePeriodFragment = {
  __typename: 'PeriodNode';
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type ProgramRequisitionOrderTypeFragment = {
  __typename: 'ProgramRequisitionOrderTypeNode';
  id: string;
  name: string;
  isEmergency: boolean;
  availablePeriods: Array<{
    __typename: 'PeriodNode';
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  }>;
};

export type ProgramSettingFragment = {
  __typename: 'ProgramSettingNode';
  masterListId: string;
  masterListCode: string;
  masterListName: string;
  masterListNameTagId: string;
  masterListNameTagName: string;
  orderTypes: Array<{
    __typename: 'ProgramRequisitionOrderTypeNode';
    id: string;
    name: string;
    isEmergency: boolean;
    availablePeriods: Array<{
      __typename: 'PeriodNode';
      id: string;
      name: string;
      startDate: string;
      endDate: string;
    }>;
  }>;
};

export type ProgramSettingsByCustomerFragment = {
  __typename: 'CustomerProgramRequisitionSettingNode';
  customerNameId: string;
  programSettings: Array<{
    __typename: 'ProgramSettingNode';
    masterListId: string;
    masterListCode: string;
    masterListName: string;
    masterListNameTagId: string;
    masterListNameTagName: string;
    orderTypes: Array<{
      __typename: 'ProgramRequisitionOrderTypeNode';
      id: string;
      name: string;
      isEmergency: boolean;
      availablePeriods: Array<{
        __typename: 'PeriodNode';
        id: string;
        name: string;
        startDate: string;
        endDate: string;
      }>;
    }>;
  }>;
};

export type ProgramRequisitionSettingsByCustomerQueryVariables = Types.Exact<{
  customerNameId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type ProgramRequisitionSettingsByCustomerQuery = {
  __typename: 'Queries';
  programRequisitionSettingsByCustomer: {
    __typename: 'CustomerProgramRequisitionSettingNode';
    customerNameId: string;
    programSettings: Array<{
      __typename: 'ProgramSettingNode';
      masterListId: string;
      masterListCode: string;
      masterListName: string;
      masterListNameTagId: string;
      masterListNameTagName: string;
      orderTypes: Array<{
        __typename: 'ProgramRequisitionOrderTypeNode';
        id: string;
        name: string;
        isEmergency: boolean;
        availablePeriods: Array<{
          __typename: 'PeriodNode';
          id: string;
          name: string;
          startDate: string;
          endDate: string;
        }>;
      }>;
    }>;
  };
};

export type ProgramIndicatorsQueryVariables = Types.Exact<{
  customerNameId: Types.Scalars['String']['input'];
  periodId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
  programId: Types.Scalars['String']['input'];
}>;

export type ProgramIndicatorsQuery = {
  __typename: 'Queries';
  programIndicators: {
    __typename: 'ProgramIndicatorConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ProgramIndicatorNode';
      code?: string | null;
      id: string;
      lineAndColumns: Array<{
        __typename: 'IndicatorLineNode';
        columns: Array<{
          __typename: 'IndicatorColumnNode';
          id: string;
          columnNumber: number;
          name: string;
          valueType?: Types.IndicatorValueTypeNode | null;
          value?: {
            __typename: 'IndicatorValueNode';
            id: string;
            value: string;
          } | null;
        }>;
        line: {
          __typename: 'IndicatorLineRowNode';
          id: string;
          code: string;
          lineNumber: number;
          name: string;
          valueType?: Types.IndicatorValueTypeNode | null;
        };
        customerIndicatorInfo: Array<{
          __typename: 'CustomerIndicatorInformationNode';
          datetime?: string | null;
          id: string;
          customer: { __typename: 'NameNode'; id: string; name: string };
          indicatorInformation: Array<{
            __typename: 'RequisitionIndicatorInformationNode';
            columnId: string;
            value: string;
          }>;
        }>;
      }>;
    }>;
  };
};

export type UpdateIndicatorValueMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateIndicatorValueInput;
}>;

export type UpdateIndicatorValueMutation = {
  __typename: 'Mutations';
  updateIndicatorValue:
    | { __typename: 'IndicatorValueNode'; id: string; value: string }
    | {
        __typename: 'UpdateIndicatorValueError';
        error:
          | { __typename: 'RecordNotFound'; description: string }
          | { __typename: 'ValueTypeNotCorrect'; description: string };
      };
};

export type InsertRequestFromResponseRequisitionMutationVariables =
  Types.Exact<{
    storeId: Types.Scalars['String']['input'];
    input: Types.InsertFromResponseRequisitionInput;
  }>;

export type InsertRequestFromResponseRequisitionMutation = {
  __typename: 'Mutations';
  insertFromResponseRequisition:
    | {
        __typename: 'InsertFromResponseRequisitionError';
        error:
          | { __typename: 'OtherPartyNotASupplier'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string };
      }
    | { __typename: 'RequisitionNode'; id: string };
};

export const ResponseLineFragmentDoc = gql`
  fragment ResponseLine on RequisitionLineNode {
    id
    itemId
    itemName
    requestedQuantity
    pricePerUnit
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
    requisitionId
    itemStats {
      __typename
      stockOnHand
      availableMonthsOfStockOnHand
      averageMonthlyConsumption
    }
    item {
      ...ItemWithStats
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
  ${ItemWithStatsFragmentDoc}
  ${ReasonOptionRowFragmentDoc}
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
    destinationCustomer(storeId: $storeId) {
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
    isEmergency
  }
  ${SyncFileReferenceFragmentDoc}
  ${ResponseLineFragmentDoc}
`;
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
    maxMonthsOfStock
    minMonthsOfStock
    documents {
      __typename
      nodes {
        ...SyncFileReference
      }
    }
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
  ${SyncFileReferenceFragmentDoc}
`;
export const CannotDeleteLineLinkedToShipmentErrorFragmentDoc = gql`
  fragment CannotDeleteLineLinkedToShipmentError on CannotDeleteLineLinkedToShipment {
    __typename
  }
`;
export const AvailablePeriodFragmentDoc = gql`
  fragment AvailablePeriod on PeriodNode {
    id
    name
    startDate
    endDate
  }
`;
export const ProgramRequisitionOrderTypeFragmentDoc = gql`
  fragment ProgramRequisitionOrderType on ProgramRequisitionOrderTypeNode {
    __typename
    id
    name
    availablePeriods {
      ...AvailablePeriod
    }
    isEmergency
  }
  ${AvailablePeriodFragmentDoc}
`;
export const ProgramSettingFragmentDoc = gql`
  fragment ProgramSetting on ProgramSettingNode {
    __typename
    masterListId
    masterListCode
    masterListName
    masterListNameTagId
    masterListNameTagName
    orderTypes {
      ...ProgramRequisitionOrderType
    }
  }
  ${ProgramRequisitionOrderTypeFragmentDoc}
`;
export const ProgramSettingsByCustomerFragmentDoc = gql`
  fragment ProgramSettingsByCustomer on CustomerProgramRequisitionSettingNode {
    __typename
    customerNameId
    programSettings {
      ...ProgramSetting
    }
  }
  ${ProgramSettingFragmentDoc}
`;
export const UpdateResponseDocument = gql`
  mutation updateResponse(
    $storeId: String!
    $input: UpdateResponseRequisitionInput!
  ) {
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
  ${RequisitionReasonsNotProvidedErrorFragmentDoc}
`;
export const DeleteResponseDocument = gql`
  mutation deleteResponse(
    $storeId: String!
    $input: BatchResponseRequisitionInput!
  ) {
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
  ${ResponseFragmentDoc}
`;
export const ResponseByIdDocument = gql`
  query responseById($storeId: String!, $requisitionId: String!) {
    requisition(id: $requisitionId, storeId: $storeId) {
      __typename
      ... on RequisitionNode {
        ...Response
      }
    }
  }
  ${ResponseFragmentDoc}
`;
export const ResponsesDocument = gql`
  query responses(
    $storeId: String!
    $filter: RequisitionFilterInput
    $page: PaginationInput
    $sort: [RequisitionSortInput!]
  ) {
    requisitions(storeId: $storeId, filter: $filter, page: $page, sort: $sort) {
      ... on RequisitionConnector {
        totalCount
        nodes {
          ...ResponseRow
        }
      }
    }
  }
  ${ResponseRowFragmentDoc}
`;
export const InsertResponseDocument = gql`
  mutation insertResponse(
    $storeId: String!
    $input: InsertResponseRequisitionInput!
  ) {
    insertResponseRequisition(input: $input, storeId: $storeId) {
      ... on RequisitionNode {
        __typename
        id
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
  mutation insertProgramResponse(
    $storeId: String!
    $input: InsertProgramResponseRequisitionInput!
  ) {
    insertProgramResponseRequisition(input: $input, storeId: $storeId) {
      ... on RequisitionNode {
        __typename
        id
      }
      ... on InsertProgramResponseRequisitionError {
        __typename
        error {
          description
          ... on MaxOrdersReachedForPeriod {
            __typename
            description
          }
        }
      }
    }
  }
`;
export const InsertResponseLineDocument = gql`
  mutation insertResponseLine(
    $storeId: String!
    $input: InsertResponseRequisitionLineInput!
  ) {
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
  mutation updateResponseLine(
    $storeId: String!
    $input: UpdateResponseRequisitionLineInput!
  ) {
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
          ... on RequisitionReasonNotProvided {
            __typename
            description
          }
        }
      }
    }
  }
`;
export const DeleteResponseLinesDocument = gql`
  mutation deleteResponseLines(
    $ids: [DeleteResponseRequisitionLineInput!]
    $storeId: String!
  ) {
    batchResponseRequisition(
      input: { deleteResponseRequisitionLines: $ids }
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
              ... on CannotDeleteLineLinkedToShipment {
                ...CannotDeleteLineLinkedToShipmentError
              }
            }
          }
          ... on DeleteResponse {
            __typename
            id
          }
        }
      }
    }
  }
  ${CannotDeleteLineLinkedToShipmentErrorFragmentDoc}
`;
export const CreateOutboundFromResponseDocument = gql`
  mutation createOutboundFromResponse($responseId: String!, $storeId: String!) {
    createRequisitionShipment(
      input: { responseRequisitionId: $responseId }
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
export const ResponseAddFromMasterListDocument = gql`
  mutation responseAddFromMasterList(
    $storeId: String!
    $responseId: String!
    $masterListId: String!
  ) {
    responseAddFromMasterList(
      input: { responseRequisitionId: $responseId, masterListId: $masterListId }
      storeId: $storeId
    ) {
      ... on RequisitionLineConnector {
        __typename
        totalCount
      }
      ... on ResponseAddFromMasterListError {
        __typename
        error {
          description
          ... on MasterListNotFoundForThisStore {
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
      input: { responseRequisitionId: $responseId }
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
  query responseRequisitionStats(
    $storeId: String!
    $requisitionLineId: String!
  ) {
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
export const ProgramRequisitionSettingsByCustomerDocument = gql`
  query programRequisitionSettingsByCustomer(
    $customerNameId: String!
    $storeId: String!
  ) {
    programRequisitionSettingsByCustomer(
      customerNameId: $customerNameId
      storeId: $storeId
    ) {
      ...ProgramSettingsByCustomer
    }
  }
  ${ProgramSettingsByCustomerFragmentDoc}
`;
export const ProgramIndicatorsDocument = gql`
  query programIndicators(
    $customerNameId: String!
    $periodId: String!
    $storeId: String!
    $programId: String!
  ) {
    programIndicators(
      storeId: $storeId
      filter: { programId: { equalTo: $programId } }
    ) {
      ... on ProgramIndicatorConnector {
        __typename
        nodes {
          ...ProgramIndicator
        }
        totalCount
      }
    }
  }
  ${ProgramIndicatorFragmentDoc}
`;
export const UpdateIndicatorValueDocument = gql`
  mutation updateIndicatorValue(
    $storeId: String!
    $input: UpdateIndicatorValueInput!
  ) {
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
export const InsertRequestFromResponseRequisitionDocument = gql`
  mutation insertRequestFromResponseRequisition(
    $storeId: String!
    $input: InsertFromResponseRequisitionInput!
  ) {
    insertFromResponseRequisition(input: $input, storeId: $storeId) {
      ... on RequisitionNode {
        __typename
        id
      }
      ... on InsertFromResponseRequisitionError {
        __typename
        error {
          description
          ... on OtherPartyNotASupplier {
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
    updateResponse(
      variables: UpdateResponseMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpdateResponseMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateResponseMutation>(
            UpdateResponseDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateResponse',
        'mutation',
        variables
      );
    },
    deleteResponse(
      variables: DeleteResponseMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<DeleteResponseMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteResponseMutation>(
            DeleteResponseDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteResponse',
        'mutation',
        variables
      );
    },
    responseByNumber(
      variables: ResponseByNumberQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ResponseByNumberQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ResponseByNumberQuery>(
            ResponseByNumberDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'responseByNumber',
        'query',
        variables
      );
    },
    responseById(
      variables: ResponseByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ResponseByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ResponseByIdQuery>(ResponseByIdDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'responseById',
        'query',
        variables
      );
    },
    responses(
      variables: ResponsesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ResponsesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ResponsesQuery>(ResponsesDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'responses',
        'query',
        variables
      );
    },
    insertResponse(
      variables: InsertResponseMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertResponseMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertResponseMutation>(
            InsertResponseDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertResponse',
        'mutation',
        variables
      );
    },
    insertProgramResponse(
      variables: InsertProgramResponseMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertProgramResponseMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertProgramResponseMutation>(
            InsertProgramResponseDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertProgramResponse',
        'mutation',
        variables
      );
    },
    insertResponseLine(
      variables: InsertResponseLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertResponseLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertResponseLineMutation>(
            InsertResponseLineDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertResponseLine',
        'mutation',
        variables
      );
    },
    updateResponseLine(
      variables: UpdateResponseLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpdateResponseLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateResponseLineMutation>(
            UpdateResponseLineDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateResponseLine',
        'mutation',
        variables
      );
    },
    deleteResponseLines(
      variables: DeleteResponseLinesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<DeleteResponseLinesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteResponseLinesMutation>(
            DeleteResponseLinesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteResponseLines',
        'mutation',
        variables
      );
    },
    createOutboundFromResponse(
      variables: CreateOutboundFromResponseMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<CreateOutboundFromResponseMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CreateOutboundFromResponseMutation>(
            CreateOutboundFromResponseDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'createOutboundFromResponse',
        'mutation',
        variables
      );
    },
    responseAddFromMasterList(
      variables: ResponseAddFromMasterListMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ResponseAddFromMasterListMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ResponseAddFromMasterListMutation>(
            ResponseAddFromMasterListDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'responseAddFromMasterList',
        'mutation',
        variables
      );
    },
    supplyRequestedQuantity(
      variables: SupplyRequestedQuantityMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<SupplyRequestedQuantityMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SupplyRequestedQuantityMutation>(
            SupplyRequestedQuantityDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'supplyRequestedQuantity',
        'mutation',
        variables
      );
    },
    responseRequisitionStats(
      variables: ResponseRequisitionStatsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ResponseRequisitionStatsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ResponseRequisitionStatsQuery>(
            ResponseRequisitionStatsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'responseRequisitionStats',
        'query',
        variables
      );
    },
    programRequisitionSettingsByCustomer(
      variables: ProgramRequisitionSettingsByCustomerQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ProgramRequisitionSettingsByCustomerQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ProgramRequisitionSettingsByCustomerQuery>(
            ProgramRequisitionSettingsByCustomerDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'programRequisitionSettingsByCustomer',
        'query',
        variables
      );
    },
    programIndicators(
      variables: ProgramIndicatorsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ProgramIndicatorsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ProgramIndicatorsQuery>(
            ProgramIndicatorsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'programIndicators',
        'query',
        variables
      );
    },
    updateIndicatorValue(
      variables: UpdateIndicatorValueMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpdateIndicatorValueMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateIndicatorValueMutation>(
            UpdateIndicatorValueDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateIndicatorValue',
        'mutation',
        variables
      );
    },
    insertRequestFromResponseRequisition(
      variables: InsertRequestFromResponseRequisitionMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertRequestFromResponseRequisitionMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertRequestFromResponseRequisitionMutation>(
            InsertRequestFromResponseRequisitionDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertRequestFromResponseRequisition',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
