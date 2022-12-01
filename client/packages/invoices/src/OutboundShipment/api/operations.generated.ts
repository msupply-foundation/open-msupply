import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type PartialStockLineFragment = { __typename: 'StockLineNode', id: string, itemId: string, availableNumberOfPacks: number, totalNumberOfPacks: number, onHold: boolean, sellPricePerPack: number, packSize: number, expiryDate?: string | null, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null };

export type OutboundLineFragment = { __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, invoiceId: string, sellPricePerPack: number, note?: string | null, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string, itemId: string, batch?: string | null, availableNumberOfPacks: number, totalNumberOfPacks: number, onHold: boolean, sellPricePerPack: number, packSize: number, expiryDate?: string | null } | null };

export type OutboundFragment = { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, invoiceId: string, sellPricePerPack: number, note?: string | null, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string, itemId: string, batch?: string | null, availableNumberOfPacks: number, totalNumberOfPacks: number, onHold: boolean, sellPricePerPack: number, packSize: number, expiryDate?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } };

export type OutboundRowFragment = { __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyId: string, otherPartyName: string, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, status: Types.InvoiceNodeStatus, colour?: string | null, pricing: { __typename: 'PricingNode', totalAfterTax: number } };

export type InvoicesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type InvoicesQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyId: string, otherPartyName: string, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, status: Types.InvoiceNodeStatus, colour?: string | null, pricing: { __typename: 'PricingNode', totalAfterTax: number } }> } };

export type InvoiceQueryVariables = Types.Exact<{
  id: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type InvoiceQuery = { __typename: 'Queries', invoice: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, invoiceId: string, sellPricePerPack: number, note?: string | null, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string, itemId: string, batch?: string | null, availableNumberOfPacks: number, totalNumberOfPacks: number, onHold: boolean, sellPricePerPack: number, packSize: number, expiryDate?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type OutboundByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int'];
  storeId: Types.Scalars['String'];
}>;


export type OutboundByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, invoiceId: string, sellPricePerPack: number, note?: string | null, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string, itemId: string, batch?: string | null, availableNumberOfPacks: number, totalNumberOfPacks: number, onHold: boolean, sellPricePerPack: number, packSize: number, expiryDate?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type InvoiceCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']>;
}>;


export type InvoiceCountsQuery = { __typename: 'Queries', invoiceCounts: { __typename: 'InvoiceCounts', outbound: { __typename: 'OutboundInvoiceCounts', toBePicked: number, created: { __typename: 'InvoiceCountsSummary', today: number, thisWeek: number } } } };

export type InsertOutboundShipmentMutationVariables = Types.Exact<{
  id: Types.Scalars['String'];
  otherPartyId: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type InsertOutboundShipmentMutation = { __typename: 'Mutations', insertOutboundShipment: { __typename: 'InsertOutboundShipmentError', error: { __typename: 'OtherPartyNotACustomer', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpdateOutboundShipmentMutationVariables = Types.Exact<{
  input: Types.UpdateOutboundShipmentInput;
  storeId: Types.Scalars['String'];
}>;


export type UpdateOutboundShipmentMutation = { __typename: 'Mutations', updateOutboundShipment: { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'UpdateOutboundShipmentError', error: { __typename: 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines', description: string } | { __typename: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'InvoiceIsNotEditable', description: string } | { __typename: 'NotAnOutboundShipmentError', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpdateOutboundShipmentNameMutationVariables = Types.Exact<{
  input: Types.UpdateOutboundShipmentNameInput;
  storeId: Types.Scalars['String'];
}>;


export type UpdateOutboundShipmentNameMutation = { __typename: 'Mutations', updateOutboundShipmentName: { __typename: 'InvoiceNode', id: string } | { __typename: 'UpdateOutboundShipmentNameError', error: { __typename: 'InvoiceIsNotEditable', description: string } | { __typename: 'NotAnOutboundShipmentError', description: string } | { __typename: 'OtherPartyNotACustomer', description: string } | { __typename: 'OtherPartyNotVisible', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type DeleteOutboundShipmentsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  deleteOutboundShipments: Array<Types.Scalars['String']> | Types.Scalars['String'];
}>;


export type DeleteOutboundShipmentsMutation = { __typename: 'Mutations', batchOutboundShipment: { __typename: 'BatchOutboundShipmentResponse', deleteOutboundShipments?: Array<{ __typename: 'DeleteOutboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type UpsertOutboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.BatchOutboundShipmentInput;
}>;


export type UpsertOutboundShipmentMutation = { __typename: 'Mutations', batchOutboundShipment: { __typename: 'BatchOutboundShipmentResponse', insertOutboundShipmentUnallocatedLines?: Array<{ __typename: 'InsertOutboundShipmentUnallocatedLineResponseWithId', id: string, response: { __typename: 'InsertOutboundShipmentUnallocatedLineError', error: { __typename: 'ForeignKeyError', description: string } | { __typename: 'UnallocatedLineForItemAlreadyExists', description: string } | { __typename: 'UnallocatedLinesOnlyEditableInNewInvoice', description: string } } | { __typename: 'InvoiceLineNode', id: string } }> | null, deleteOutboundShipmentLines?: Array<{ __typename: 'DeleteOutboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, deleteOutboundShipmentServiceLines?: Array<{ __typename: 'DeleteOutboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, deleteOutboundShipmentUnallocatedLines?: Array<{ __typename: 'DeleteOutboundShipmentUnallocatedLineResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentUnallocatedLineError', error: { __typename: 'ForeignKeyError', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, deleteOutboundShipments?: Array<{ __typename: 'DeleteOutboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, insertOutboundShipmentLines?: Array<{ __typename: 'InsertOutboundShipmentLineResponseWithId', id: string, response: { __typename: 'InsertOutboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string } | { __typename: 'LocationIsOnHold', description: string } | { __typename: 'LocationNotFound', description: string } | { __typename: 'NotEnoughStockForReduction', description: string } | { __typename: 'StockLineAlreadyExistsInInvoice', description: string } | { __typename: 'StockLineIsOnHold', description: string } } | { __typename: 'InvoiceLineNode' } }> | null, insertOutboundShipmentServiceLines?: Array<{ __typename: 'InsertOutboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'InsertOutboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string } } | { __typename: 'InvoiceLineNode' } }> | null, insertOutboundShipments?: Array<{ __typename: 'InsertOutboundShipmentResponseWithId', id: string, response: { __typename: 'InsertOutboundShipmentError', error: { __typename: 'OtherPartyNotACustomer', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode' } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } }> | null, updateOutboundShipmentLines?: Array<{ __typename: 'UpdateOutboundShipmentLineResponseWithId', id: string, response: { __typename: 'InvoiceLineNode' } | { __typename: 'UpdateOutboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'LocationIsOnHold', description: string } | { __typename: 'LocationNotFound', description: string } | { __typename: 'NotEnoughStockForReduction', description: string, batch: { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'StockLineNode' } } | { __typename: 'RecordNotFound', description: string } | { __typename: 'StockLineAlreadyExistsInInvoice', description: string } | { __typename: 'StockLineIsOnHold', description: string } } }> | null, updateOutboundShipmentServiceLines?: Array<{ __typename: 'UpdateOutboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'InvoiceLineNode' } | { __typename: 'UpdateOutboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } }> | null, updateOutboundShipmentUnallocatedLines?: Array<{ __typename: 'UpdateOutboundShipmentUnallocatedLineResponseWithId', id: string, response: { __typename: 'InvoiceLineNode' } | { __typename: 'UpdateOutboundShipmentUnallocatedLineError', error: { __typename: 'ForeignKeyError', description: string } | { __typename: 'RecordNotFound', description: string } } }> | null, updateOutboundShipments?: Array<{ __typename: 'UpdateOutboundShipmentResponseWithId', id: string, response: { __typename: 'InvoiceNode' } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'UpdateOutboundShipmentError', error: { __typename: 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines', description: string } | { __typename: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'InvoiceIsNotEditable', description: string } | { __typename: 'NotAnOutboundShipmentError', description: string } | { __typename: 'RecordNotFound', description: string } } }> | null, allocateOutboundShipmentUnallocatedLines?: Array<{ __typename: 'AllocateOutboundShipmentUnallocatedLineResponseWithId', id: string, response: { __typename: 'AllocateOutboundShipmentUnallocatedLineError', error: { __typename: 'RecordNotFound', description: string } } | { __typename: 'AllocateOutboundShipmentUnallocatedLineNode', deletes: Array<{ __typename: 'DeleteResponse', id: string }>, inserts: { __typename: 'InvoiceLineConnector', totalCount: number }, updates: { __typename: 'InvoiceLineConnector', totalCount: number } } }> | null } };

export type DeleteOutboundShipmentLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  deleteOutboundShipmentLines: Array<Types.DeleteOutboundShipmentLineInput> | Types.DeleteOutboundShipmentLineInput;
}>;


export type DeleteOutboundShipmentLinesMutation = { __typename: 'Mutations', batchOutboundShipment: { __typename: 'BatchOutboundShipmentResponse', deleteOutboundShipmentLines?: Array<{ __typename: 'DeleteOutboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type AddToOutboundShipmentFromMasterListMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  shipmentId: Types.Scalars['String'];
  masterListId: Types.Scalars['String'];
}>;


export type AddToOutboundShipmentFromMasterListMutation = { __typename: 'Mutations', addToOutboundShipmentFromMasterList: { __typename: 'AddToOutboundShipmentFromMasterListError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'MasterListNotFoundForThisName', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'InvoiceLineConnector', totalCount: number } };

export const PartialStockLineFragmentDoc = gql`
    fragment PartialStockLine on StockLineNode {
  id
  itemId
  availableNumberOfPacks
  totalNumberOfPacks
  onHold
  sellPricePerPack
  packSize
  expiryDate
  location {
    __typename
    id
    name
    code
    onHold
  }
}
    `;
export const OutboundLineFragmentDoc = gql`
    fragment OutboundLine on InvoiceLineNode {
  __typename
  id
  type
  batch
  expiryDate
  numberOfPacks
  packSize
  invoiceId
  sellPricePerPack
  note
  totalBeforeTax
  totalAfterTax
  taxPercentage
  note
  item {
    __typename
    id
    name
    code
    unitName
  }
  location {
    __typename
    id
    name
    code
    onHold
  }
  stockLine {
    __typename
    id
    itemId
    batch
    availableNumberOfPacks
    totalNumberOfPacks
    onHold
    sellPricePerPack
    packSize
    expiryDate
  }
}
    `;
export const OutboundFragmentDoc = gql`
    fragment Outbound on InvoiceNode {
  __typename
  id
  comment
  createdDatetime
  allocatedDatetime
  deliveredDatetime
  pickedDatetime
  shippedDatetime
  verifiedDatetime
  invoiceNumber
  colour
  onHold
  otherPartyId
  otherPartyName
  status
  theirReference
  transportReference
  type
  user {
    __typename
    username
    email
  }
  requisition {
    __typename
    id
    requisitionNumber
    createdDatetime
    user {
      __typename
      username
    }
  }
  lines {
    __typename
    nodes {
      ...OutboundLine
    }
    totalCount
  }
  otherParty(storeId: $storeId) {
    __typename
    id
    name
    code
    isCustomer
    isSupplier
    isOnHold
  }
  pricing {
    __typename
    totalAfterTax
    totalBeforeTax
    stockTotalBeforeTax
    stockTotalAfterTax
    serviceTotalAfterTax
    serviceTotalBeforeTax
  }
}
    ${OutboundLineFragmentDoc}`;
export const OutboundRowFragmentDoc = gql`
    fragment OutboundRow on InvoiceNode {
  __typename
  comment
  createdDatetime
  allocatedDatetime
  deliveredDatetime
  pickedDatetime
  shippedDatetime
  verifiedDatetime
  id
  invoiceNumber
  otherPartyId
  otherPartyName
  theirReference
  transportReference
  type
  status
  colour
  pricing {
    __typename
    totalAfterTax
  }
}
    `;
export const InvoicesDocument = gql`
    query invoices($first: Int, $offset: Int, $key: InvoiceSortFieldInput!, $desc: Boolean, $filter: InvoiceFilterInput, $storeId: String!) {
  invoices(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
  ) {
    ... on InvoiceConnector {
      __typename
      nodes {
        ...OutboundRow
      }
      totalCount
    }
  }
}
    ${OutboundRowFragmentDoc}`;
export const InvoiceDocument = gql`
    query invoice($id: String!, $storeId: String!) {
  invoice(id: $id, storeId: $storeId) {
    __typename
    ... on NodeError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordNotFound {
          __typename
          description
        }
      }
    }
    ... on InvoiceNode {
      ...Outbound
    }
  }
}
    ${OutboundFragmentDoc}`;
export const OutboundByNumberDocument = gql`
    query outboundByNumber($invoiceNumber: Int!, $storeId: String!) {
  invoiceByNumber(
    invoiceNumber: $invoiceNumber
    storeId: $storeId
    type: OUTBOUND_SHIPMENT
  ) {
    __typename
    ... on NodeError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordNotFound {
          __typename
          description
        }
      }
    }
    ... on InvoiceNode {
      ...Outbound
    }
  }
}
    ${OutboundFragmentDoc}`;
export const InvoiceCountsDocument = gql`
    query invoiceCounts($storeId: String!, $timezoneOffset: Int) {
  invoiceCounts(storeId: $storeId, timezoneOffset: $timezoneOffset) {
    outbound {
      created {
        today
        thisWeek
      }
      toBePicked
    }
  }
}
    `;
export const InsertOutboundShipmentDocument = gql`
    mutation insertOutboundShipment($id: String!, $otherPartyId: String!, $storeId: String!) {
  insertOutboundShipment(
    storeId: $storeId
    input: {id: $id, otherPartyId: $otherPartyId}
  ) {
    __typename
    ... on InvoiceNode {
      id
      invoiceNumber
    }
    ... on InsertOutboundShipmentError {
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
        ... on OtherPartyNotACustomer {
          __typename
          description
        }
        description
      }
    }
    ... on NodeError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
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
export const UpdateOutboundShipmentDocument = gql`
    mutation updateOutboundShipment($input: UpdateOutboundShipmentInput!, $storeId: String!) {
  updateOutboundShipment(input: $input, storeId: $storeId) {
    ... on UpdateOutboundShipmentError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on CanOnlyChangeToAllocatedWhenNoUnallocatedLines {
          __typename
          description
        }
        ... on CannotChangeStatusOfInvoiceOnHold {
          __typename
          description
        }
        ... on CannotReverseInvoiceStatus {
          __typename
          description
        }
        ... on InvoiceIsNotEditable {
          __typename
          description
        }
        ... on NotAnOutboundShipmentError {
          __typename
          description
        }
        ... on OtherPartyNotACustomerError {
          __typename
          description
        }
      }
    }
    ... on NodeError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on DatabaseError {
          __typename
          description
          fullError
        }
      }
    }
    ... on InvoiceNode {
      id
      invoiceNumber
    }
  }
}
    `;
export const UpdateOutboundShipmentNameDocument = gql`
    mutation updateOutboundShipmentName($input: UpdateOutboundShipmentNameInput!, $storeId: String!) {
  updateOutboundShipmentName(input: $input, storeId: $storeId) {
    ... on UpdateOutboundShipmentNameError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on InvoiceIsNotEditable {
          __typename
          description
        }
        ... on NotAnOutboundShipmentError {
          __typename
          description
        }
        ... on OtherPartyNotVisible {
          __typename
          description
        }
        ... on OtherPartyNotACustomer {
          __typename
          description
        }
      }
    }
    ... on InvoiceNode {
      __typename
      id
    }
  }
}
    `;
export const DeleteOutboundShipmentsDocument = gql`
    mutation deleteOutboundShipments($storeId: String!, $deleteOutboundShipments: [String!]!) {
  batchOutboundShipment(
    storeId: $storeId
    input: {deleteOutboundShipments: $deleteOutboundShipments}
  ) {
    __typename
    deleteOutboundShipments {
      id
      response {
        ... on DeleteOutboundShipmentError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotDeleteInvoiceWithLines {
              __typename
              description
            }
            ... on CannotEditInvoice {
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
export const UpsertOutboundShipmentDocument = gql`
    mutation upsertOutboundShipment($storeId: String!, $input: BatchOutboundShipmentInput!) {
  batchOutboundShipment(storeId: $storeId, input: $input) {
    __typename
    insertOutboundShipmentUnallocatedLines {
      id
      response {
        ... on InsertOutboundShipmentUnallocatedLineError {
          __typename
          error {
            description
          }
        }
        ... on InvoiceLineNode {
          id
        }
      }
    }
    deleteOutboundShipmentLines {
      id
      response {
        ... on DeleteOutboundShipmentLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotEditInvoice {
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
        ... on DeleteResponse {
          id
        }
      }
    }
    deleteOutboundShipmentServiceLines {
      id
      response {
        ... on DeleteResponse {
          id
        }
        ... on DeleteOutboundShipmentServiceLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotEditInvoice {
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
    deleteOutboundShipmentUnallocatedLines {
      id
      response {
        ... on DeleteResponse {
          id
        }
        ... on DeleteOutboundShipmentUnallocatedLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
          }
        }
      }
    }
    deleteOutboundShipments {
      id
      response {
        ... on DeleteResponse {
          id
        }
        ... on DeleteOutboundShipmentError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotDeleteInvoiceWithLines {
              __typename
              description
            }
            ... on CannotEditInvoice {
              __typename
              description
            }
          }
        }
      }
    }
    insertOutboundShipmentLines {
      id
      response {
        ... on InsertOutboundShipmentLineError {
          __typename
          error {
            description
          }
        }
      }
    }
    insertOutboundShipmentServiceLines {
      id
      response {
        ... on InsertOutboundShipmentServiceLineError {
          __typename
          error {
            description
          }
        }
      }
    }
    insertOutboundShipments {
      id
      response {
        ... on InsertOutboundShipmentError {
          __typename
          error {
            description
          }
        }
        ... on NodeError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on DatabaseError {
              __typename
              description
              fullError
            }
          }
        }
      }
    }
    updateOutboundShipmentLines {
      id
      response {
        ... on UpdateOutboundShipmentLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotEditInvoice {
              __typename
              description
            }
            ... on ForeignKeyError {
              __typename
              description
              key
            }
            ... on LocationIsOnHold {
              __typename
              description
            }
            ... on LocationNotFound {
              __typename
              description
            }
            ... on NotEnoughStockForReduction {
              __typename
              batch {
                ... on NodeError {
                  __typename
                  error {
                    description
                    ... on RecordNotFound {
                      __typename
                      description
                    }
                    ... on DatabaseError {
                      __typename
                      description
                      fullError
                    }
                  }
                }
              }
            }
            ... on StockLineAlreadyExistsInInvoice {
              __typename
              description
            }
            ... on StockLineIsOnHold {
              __typename
              description
            }
          }
        }
      }
    }
    updateOutboundShipmentServiceLines {
      id
      response {
        ... on UpdateOutboundShipmentServiceLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotEditInvoice {
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
    updateOutboundShipmentUnallocatedLines {
      id
      response {
        ... on UpdateOutboundShipmentUnallocatedLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
          }
        }
      }
    }
    updateOutboundShipments {
      id
      response {
        ... on UpdateOutboundShipmentError {
          __typename
          error {
            description
          }
        }
        ... on NodeError {
          __typename
          error {
            description
          }
        }
      }
    }
    allocateOutboundShipmentUnallocatedLines {
      id
      response {
        ... on AllocateOutboundShipmentUnallocatedLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
          }
        }
        ... on AllocateOutboundShipmentUnallocatedLineNode {
          __typename
          deletes {
            id
          }
          inserts {
            totalCount
          }
          updates {
            totalCount
          }
        }
      }
    }
  }
}
    `;
export const DeleteOutboundShipmentLinesDocument = gql`
    mutation deleteOutboundShipmentLines($storeId: String!, $deleteOutboundShipmentLines: [DeleteOutboundShipmentLineInput!]!) {
  batchOutboundShipment(
    storeId: $storeId
    input: {deleteOutboundShipmentLines: $deleteOutboundShipmentLines}
  ) {
    deleteOutboundShipmentLines {
      id
      response {
        ... on DeleteOutboundShipmentLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotEditInvoice {
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
        ... on DeleteResponse {
          id
        }
      }
    }
  }
}
    `;
export const AddToOutboundShipmentFromMasterListDocument = gql`
    mutation addToOutboundShipmentFromMasterList($storeId: String!, $shipmentId: String!, $masterListId: String!) {
  addToOutboundShipmentFromMasterList(
    input: {shipmentId: $shipmentId, masterListId: $masterListId}
    storeId: $storeId
  ) {
    ... on AddToOutboundShipmentFromMasterListError {
      __typename
      error {
        ... on MasterListNotFoundForThisName {
          __typename
          description
        }
        ... on CannotEditInvoice {
          __typename
          description
        }
        ... on RecordNotFound {
          __typename
          description
        }
        description
      }
    }
    ... on InvoiceLineConnector {
      __typename
      totalCount
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    invoices(variables: InvoicesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InvoicesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoicesQuery>(InvoicesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoices', 'query');
    },
    invoice(variables: InvoiceQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InvoiceQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceQuery>(InvoiceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoice', 'query');
    },
    outboundByNumber(variables: OutboundByNumberQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<OutboundByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OutboundByNumberQuery>(OutboundByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'outboundByNumber', 'query');
    },
    invoiceCounts(variables: InvoiceCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InvoiceCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceCountsQuery>(InvoiceCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoiceCounts', 'query');
    },
    insertOutboundShipment(variables: InsertOutboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertOutboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertOutboundShipmentMutation>(InsertOutboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertOutboundShipment', 'mutation');
    },
    updateOutboundShipment(variables: UpdateOutboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateOutboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateOutboundShipmentMutation>(UpdateOutboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateOutboundShipment', 'mutation');
    },
    updateOutboundShipmentName(variables: UpdateOutboundShipmentNameMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateOutboundShipmentNameMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateOutboundShipmentNameMutation>(UpdateOutboundShipmentNameDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateOutboundShipmentName', 'mutation');
    },
    deleteOutboundShipments(variables: DeleteOutboundShipmentsMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteOutboundShipmentsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteOutboundShipmentsMutation>(DeleteOutboundShipmentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteOutboundShipments', 'mutation');
    },
    upsertOutboundShipment(variables: UpsertOutboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpsertOutboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertOutboundShipmentMutation>(UpsertOutboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'upsertOutboundShipment', 'mutation');
    },
    deleteOutboundShipmentLines(variables: DeleteOutboundShipmentLinesMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteOutboundShipmentLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteOutboundShipmentLinesMutation>(DeleteOutboundShipmentLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteOutboundShipmentLines', 'mutation');
    },
    addToOutboundShipmentFromMasterList(variables: AddToOutboundShipmentFromMasterListMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<AddToOutboundShipmentFromMasterListMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<AddToOutboundShipmentFromMasterListMutation>(AddToOutboundShipmentFromMasterListDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'addToOutboundShipmentFromMasterList', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInvoicesQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoices })
 *   )
 * })
 */
export const mockInvoicesQuery = (resolver: ResponseResolver<GraphQLRequest<InvoicesQueryVariables>, GraphQLContext<InvoicesQuery>, any>) =>
  graphql.query<InvoicesQuery, InvoicesQueryVariables>(
    'invoices',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInvoiceQuery((req, res, ctx) => {
 *   const { id, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoice })
 *   )
 * })
 */
export const mockInvoiceQuery = (resolver: ResponseResolver<GraphQLRequest<InvoiceQueryVariables>, GraphQLContext<InvoiceQuery>, any>) =>
  graphql.query<InvoiceQuery, InvoiceQueryVariables>(
    'invoice',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockOutboundByNumberQuery((req, res, ctx) => {
 *   const { invoiceNumber, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoiceByNumber })
 *   )
 * })
 */
export const mockOutboundByNumberQuery = (resolver: ResponseResolver<GraphQLRequest<OutboundByNumberQueryVariables>, GraphQLContext<OutboundByNumberQuery>, any>) =>
  graphql.query<OutboundByNumberQuery, OutboundByNumberQueryVariables>(
    'outboundByNumber',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInvoiceCountsQuery((req, res, ctx) => {
 *   const { storeId, timezoneOffset } = req.variables;
 *   return res(
 *     ctx.data({ invoiceCounts })
 *   )
 * })
 */
export const mockInvoiceCountsQuery = (resolver: ResponseResolver<GraphQLRequest<InvoiceCountsQueryVariables>, GraphQLContext<InvoiceCountsQuery>, any>) =>
  graphql.query<InvoiceCountsQuery, InvoiceCountsQueryVariables>(
    'invoiceCounts',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertOutboundShipmentMutation((req, res, ctx) => {
 *   const { id, otherPartyId, storeId } = req.variables;
 *   return res(
 *     ctx.data({ insertOutboundShipment })
 *   )
 * })
 */
export const mockInsertOutboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<InsertOutboundShipmentMutationVariables>, GraphQLContext<InsertOutboundShipmentMutation>, any>) =>
  graphql.mutation<InsertOutboundShipmentMutation, InsertOutboundShipmentMutationVariables>(
    'insertOutboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateOutboundShipmentMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ updateOutboundShipment })
 *   )
 * })
 */
export const mockUpdateOutboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateOutboundShipmentMutationVariables>, GraphQLContext<UpdateOutboundShipmentMutation>, any>) =>
  graphql.mutation<UpdateOutboundShipmentMutation, UpdateOutboundShipmentMutationVariables>(
    'updateOutboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateOutboundShipmentNameMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ updateOutboundShipmentName })
 *   )
 * })
 */
export const mockUpdateOutboundShipmentNameMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateOutboundShipmentNameMutationVariables>, GraphQLContext<UpdateOutboundShipmentNameMutation>, any>) =>
  graphql.mutation<UpdateOutboundShipmentNameMutation, UpdateOutboundShipmentNameMutationVariables>(
    'updateOutboundShipmentName',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteOutboundShipmentsMutation((req, res, ctx) => {
 *   const { storeId, deleteOutboundShipments } = req.variables;
 *   return res(
 *     ctx.data({ batchOutboundShipment })
 *   )
 * })
 */
export const mockDeleteOutboundShipmentsMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteOutboundShipmentsMutationVariables>, GraphQLContext<DeleteOutboundShipmentsMutation>, any>) =>
  graphql.mutation<DeleteOutboundShipmentsMutation, DeleteOutboundShipmentsMutationVariables>(
    'deleteOutboundShipments',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpsertOutboundShipmentMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ batchOutboundShipment })
 *   )
 * })
 */
export const mockUpsertOutboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<UpsertOutboundShipmentMutationVariables>, GraphQLContext<UpsertOutboundShipmentMutation>, any>) =>
  graphql.mutation<UpsertOutboundShipmentMutation, UpsertOutboundShipmentMutationVariables>(
    'upsertOutboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteOutboundShipmentLinesMutation((req, res, ctx) => {
 *   const { storeId, deleteOutboundShipmentLines } = req.variables;
 *   return res(
 *     ctx.data({ batchOutboundShipment })
 *   )
 * })
 */
export const mockDeleteOutboundShipmentLinesMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteOutboundShipmentLinesMutationVariables>, GraphQLContext<DeleteOutboundShipmentLinesMutation>, any>) =>
  graphql.mutation<DeleteOutboundShipmentLinesMutation, DeleteOutboundShipmentLinesMutationVariables>(
    'deleteOutboundShipmentLines',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAddToOutboundShipmentFromMasterListMutation((req, res, ctx) => {
 *   const { storeId, shipmentId, masterListId } = req.variables;
 *   return res(
 *     ctx.data({ addToOutboundShipmentFromMasterList })
 *   )
 * })
 */
export const mockAddToOutboundShipmentFromMasterListMutation = (resolver: ResponseResolver<GraphQLRequest<AddToOutboundShipmentFromMasterListMutationVariables>, GraphQLContext<AddToOutboundShipmentFromMasterListMutation>, any>) =>
  graphql.mutation<AddToOutboundShipmentFromMasterListMutation, AddToOutboundShipmentFromMasterListMutationVariables>(
    'addToOutboundShipmentFromMasterList',
    resolver
  )
