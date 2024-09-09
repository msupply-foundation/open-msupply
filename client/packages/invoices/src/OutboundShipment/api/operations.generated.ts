import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { StockOutLineFragmentDoc } from '../../StockOut/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type OutboundFragment = { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, taxPercentage?: number | null, currencyRate: number, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, invoiceId: string, sellPricePerPack: number, note?: string | null, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, itemName: string, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string, itemId: string, batch?: string | null, availableNumberOfPacks: number, totalNumberOfPacks: number, onHold: boolean, sellPricePerPack: number, packSize: number, expiryDate?: string | null, item: { __typename: 'ItemNode', name: string, code: string } } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number, taxPercentage?: number | null, foreignCurrencyTotalAfterTax?: number | null }, currency?: { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean } | null };

export type OutboundRowFragment = { __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyId: string, otherPartyName: string, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, status: Types.InvoiceNodeStatus, colour?: string | null, taxPercentage?: number | null, currencyRate: number, pricing: { __typename: 'PricingNode', totalAfterTax: number, taxPercentage?: number | null, foreignCurrencyTotalAfterTax?: number | null }, currency?: { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean } | null };

export type BarcodeFragment = { __typename: 'BarcodeNode', id: string, itemId: string, packSize?: number | null, gtin: string };

export type InvoicesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type InvoicesQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyId: string, otherPartyName: string, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, status: Types.InvoiceNodeStatus, colour?: string | null, taxPercentage?: number | null, currencyRate: number, pricing: { __typename: 'PricingNode', totalAfterTax: number, taxPercentage?: number | null, foreignCurrencyTotalAfterTax?: number | null }, currency?: { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean } | null }> } };

export type InvoiceQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type InvoiceQuery = { __typename: 'Queries', invoice: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, taxPercentage?: number | null, currencyRate: number, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, invoiceId: string, sellPricePerPack: number, note?: string | null, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, itemName: string, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string, itemId: string, batch?: string | null, availableNumberOfPacks: number, totalNumberOfPacks: number, onHold: boolean, sellPricePerPack: number, packSize: number, expiryDate?: string | null, item: { __typename: 'ItemNode', name: string, code: string } } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number, taxPercentage?: number | null, foreignCurrencyTotalAfterTax?: number | null }, currency?: { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean } | null } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type OutboundByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type OutboundByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, taxPercentage?: number | null, currencyRate: number, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, invoiceId: string, sellPricePerPack: number, note?: string | null, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, itemName: string, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string, itemId: string, batch?: string | null, availableNumberOfPacks: number, totalNumberOfPacks: number, onHold: boolean, sellPricePerPack: number, packSize: number, expiryDate?: string | null, item: { __typename: 'ItemNode', name: string, code: string } } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number, taxPercentage?: number | null, foreignCurrencyTotalAfterTax?: number | null }, currency?: { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean } | null } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type InvoiceCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;


export type InvoiceCountsQuery = { __typename: 'Queries', invoiceCounts: { __typename: 'InvoiceCounts', outbound: { __typename: 'OutboundInvoiceCounts', notShipped: number, created: { __typename: 'InvoiceCountsSummary', today: number, thisWeek: number } } } };

export type BarcodeByGtinQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  gtin: Types.Scalars['String']['input'];
}>;


export type BarcodeByGtinQuery = { __typename: 'Queries', barcodeByGtin: { __typename: 'BarcodeNode', id: string, itemId: string, packSize?: number | null, gtin: string } | { __typename: 'NodeError' } };

export type InsertOutboundShipmentMutationVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  otherPartyId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type InsertOutboundShipmentMutation = { __typename: 'Mutations', insertOutboundShipment: { __typename: 'InsertOutboundShipmentError', error: { __typename: 'OtherPartyNotACustomer', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpdateOutboundShipmentMutationVariables = Types.Exact<{
  input: Types.UpdateOutboundShipmentInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type UpdateOutboundShipmentMutation = { __typename: 'Mutations', updateOutboundShipment: { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'UpdateOutboundShipmentError', error: { __typename: 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines', description: string } | { __typename: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename: 'CannotIssueInForeignCurrency', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'InvoiceIsNotEditable', description: string } | { __typename: 'NotAnOutboundShipmentError', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpdateOutboundShipmentNameMutationVariables = Types.Exact<{
  input: Types.UpdateOutboundShipmentNameInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type UpdateOutboundShipmentNameMutation = { __typename: 'Mutations', updateOutboundShipmentName: { __typename: 'InvoiceNode', id: string } | { __typename: 'UpdateOutboundShipmentNameError', error: { __typename: 'InvoiceIsNotEditable', description: string } | { __typename: 'NotAnOutboundShipmentError', description: string } | { __typename: 'OtherPartyNotACustomer', description: string } | { __typename: 'OtherPartyNotVisible', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type DeleteOutboundShipmentsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  deleteOutboundShipments: Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input'];
}>;


export type DeleteOutboundShipmentsMutation = { __typename: 'Mutations', batchOutboundShipment: { __typename: 'BatchOutboundShipmentResponse', deleteOutboundShipments?: Array<{ __typename: 'DeleteOutboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type UpsertOutboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchOutboundShipmentInput;
}>;


export type UpsertOutboundShipmentMutation = { __typename: 'Mutations', batchOutboundShipment: { __typename: 'BatchOutboundShipmentResponse', insertOutboundShipmentUnallocatedLines?: Array<{ __typename: 'InsertOutboundShipmentUnallocatedLineResponseWithId', id: string, response: { __typename: 'InsertOutboundShipmentUnallocatedLineError', error: { __typename: 'ForeignKeyError', description: string } | { __typename: 'UnallocatedLineForItemAlreadyExists', description: string } | { __typename: 'UnallocatedLinesOnlyEditableInNewInvoice', description: string } } | { __typename: 'InvoiceLineNode', id: string } }> | null, deleteOutboundShipmentLines?: Array<{ __typename: 'DeleteOutboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, deleteOutboundShipmentServiceLines?: Array<{ __typename: 'DeleteOutboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, deleteOutboundShipmentUnallocatedLines?: Array<{ __typename: 'DeleteOutboundShipmentUnallocatedLineResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentUnallocatedLineError', error: { __typename: 'ForeignKeyError', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, deleteOutboundShipments?: Array<{ __typename: 'DeleteOutboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, insertOutboundShipmentLines?: Array<{ __typename: 'InsertOutboundShipmentLineResponseWithId', id: string, response: { __typename: 'InsertOutboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string } | { __typename: 'LocationIsOnHold', description: string } | { __typename: 'LocationNotFound', description: string } | { __typename: 'NotEnoughStockForReduction', description: string } | { __typename: 'StockLineAlreadyExistsInInvoice', description: string } | { __typename: 'StockLineIsOnHold', description: string } } | { __typename: 'InvoiceLineNode' } }> | null, insertOutboundShipmentServiceLines?: Array<{ __typename: 'InsertOutboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'InsertOutboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string } } | { __typename: 'InvoiceLineNode' } }> | null, insertOutboundShipments?: Array<{ __typename: 'InsertOutboundShipmentResponseWithId', id: string, response: { __typename: 'InsertOutboundShipmentError', error: { __typename: 'OtherPartyNotACustomer', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode' } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } }> | null, updateOutboundShipmentLines?: Array<{ __typename: 'UpdateOutboundShipmentLineResponseWithId', id: string, response: { __typename: 'InvoiceLineNode' } | { __typename: 'UpdateOutboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'LocationIsOnHold', description: string } | { __typename: 'LocationNotFound', description: string } | { __typename: 'NotEnoughStockForReduction', description: string, batch: { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'StockLineNode' } } | { __typename: 'RecordNotFound', description: string } | { __typename: 'StockLineAlreadyExistsInInvoice', description: string } | { __typename: 'StockLineIsOnHold', description: string } } }> | null, updateOutboundShipmentServiceLines?: Array<{ __typename: 'UpdateOutboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'InvoiceLineNode' } | { __typename: 'UpdateOutboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } }> | null, updateOutboundShipmentUnallocatedLines?: Array<{ __typename: 'UpdateOutboundShipmentUnallocatedLineResponseWithId', id: string, response: { __typename: 'InvoiceLineNode' } | { __typename: 'UpdateOutboundShipmentUnallocatedLineError', error: { __typename: 'ForeignKeyError', description: string } | { __typename: 'RecordNotFound', description: string } } }> | null, updateOutboundShipments?: Array<{ __typename: 'UpdateOutboundShipmentResponseWithId', id: string, response: { __typename: 'InvoiceNode' } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'UpdateOutboundShipmentError', error: { __typename: 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines', description: string } | { __typename: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename: 'CannotIssueInForeignCurrency', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'InvoiceIsNotEditable', description: string } | { __typename: 'NotAnOutboundShipmentError', description: string } | { __typename: 'RecordNotFound', description: string } } }> | null, allocateOutboundShipmentUnallocatedLines?: Array<{ __typename: 'AllocateOutboundShipmentUnallocatedLineResponseWithId', id: string, response: { __typename: 'AllocateOutboundShipmentUnallocatedLineError', error: { __typename: 'RecordNotFound', description: string } } | { __typename: 'AllocateOutboundShipmentUnallocatedLineNode', deletes: Array<{ __typename: 'DeleteResponse', id: string }>, inserts: { __typename: 'InvoiceLineConnector', totalCount: number }, updates: { __typename: 'InvoiceLineConnector', totalCount: number } } }> | null } };

export type DeleteOutboundShipmentLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  deleteOutboundShipmentLines: Array<Types.DeleteOutboundShipmentLineInput> | Types.DeleteOutboundShipmentLineInput;
}>;


export type DeleteOutboundShipmentLinesMutation = { __typename: 'Mutations', batchOutboundShipment: { __typename: 'BatchOutboundShipmentResponse', deleteOutboundShipmentLines?: Array<{ __typename: 'DeleteOutboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type AddToOutboundShipmentFromMasterListMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  shipmentId: Types.Scalars['String']['input'];
  masterListId: Types.Scalars['String']['input'];
}>;


export type AddToOutboundShipmentFromMasterListMutation = { __typename: 'Mutations', addToOutboundShipmentFromMasterList: { __typename: 'AddToOutboundShipmentFromMasterListError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'MasterListNotFoundForThisName', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'InvoiceLineConnector', totalCount: number } };

export type ItemPriceFragment = { __typename: 'ItemPriceNode', defaultPricePerUnit?: number | null, discountPercentage?: number | null, calculatedPricePerUnit?: number | null };

export type GetItemPricingQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.ItemPriceInput;
}>;


export type GetItemPricingQuery = { __typename: 'Queries', itemPrice: { __typename: 'ItemPriceNode', defaultPricePerUnit?: number | null, discountPercentage?: number | null, calculatedPricePerUnit?: number | null } };

export type InsertBarcodeMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertBarcodeInput;
}>;


export type InsertBarcodeMutation = { __typename: 'Mutations', insertBarcode: { __typename: 'BarcodeNode', id: string, itemId: string, packSize?: number | null, gtin: string } };

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
  taxPercentage
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
      ...StockOutLine
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
    store {
      id
      code
    }
  }
  pricing {
    __typename
    totalAfterTax
    totalBeforeTax
    stockTotalBeforeTax
    stockTotalAfterTax
    serviceTotalAfterTax
    serviceTotalBeforeTax
    taxPercentage
    foreignCurrencyTotalAfterTax
  }
  currency {
    id
    code
    rate
    isHomeCurrency
  }
  currencyRate
}
    ${StockOutLineFragmentDoc}`;
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
  taxPercentage
  pricing {
    __typename
    totalAfterTax
    taxPercentage
    foreignCurrencyTotalAfterTax
  }
  currency {
    id
    code
    rate
    isHomeCurrency
  }
  currencyRate
}
    `;
export const BarcodeFragmentDoc = gql`
    fragment Barcode on BarcodeNode {
  __typename
  id
  itemId
  packSize
  gtin
}
    `;
export const ItemPriceFragmentDoc = gql`
    fragment itemPrice on ItemPriceNode {
  defaultPricePerUnit
  discountPercentage
  calculatedPricePerUnit
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
      notShipped
    }
  }
}
    `;
export const BarcodeByGtinDocument = gql`
    query barcodeByGtin($storeId: String!, $gtin: String!) {
  barcodeByGtin(storeId: $storeId, gtin: $gtin) {
    ... on BarcodeNode {
      __typename
      ...Barcode
    }
  }
}
    ${BarcodeFragmentDoc}`;
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
        ... on CannotIssueInForeignCurrency {
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
        ... on RecordNotFound {
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
export const GetItemPricingDocument = gql`
    query getItemPricing($storeId: String!, $input: ItemPriceInput!) {
  itemPrice(storeId: $storeId, input: $input) {
    ... on ItemPriceNode {
      ...itemPrice
    }
  }
}
    ${ItemPriceFragmentDoc}`;
export const InsertBarcodeDocument = gql`
    mutation insertBarcode($storeId: String!, $input: InsertBarcodeInput!) {
  insertBarcode(input: $input, storeId: $storeId) {
    ... on BarcodeNode {
      ...Barcode
    }
  }
}
    ${BarcodeFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    invoices(variables: InvoicesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InvoicesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoicesQuery>(InvoicesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoices', 'query', variables);
    },
    invoice(variables: InvoiceQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InvoiceQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceQuery>(InvoiceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoice', 'query', variables);
    },
    outboundByNumber(variables: OutboundByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<OutboundByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OutboundByNumberQuery>(OutboundByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'outboundByNumber', 'query', variables);
    },
    invoiceCounts(variables: InvoiceCountsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InvoiceCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceCountsQuery>(InvoiceCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoiceCounts', 'query', variables);
    },
    barcodeByGtin(variables: BarcodeByGtinQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<BarcodeByGtinQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<BarcodeByGtinQuery>(BarcodeByGtinDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'barcodeByGtin', 'query', variables);
    },
    insertOutboundShipment(variables: InsertOutboundShipmentMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertOutboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertOutboundShipmentMutation>(InsertOutboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertOutboundShipment', 'mutation', variables);
    },
    updateOutboundShipment(variables: UpdateOutboundShipmentMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateOutboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateOutboundShipmentMutation>(UpdateOutboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateOutboundShipment', 'mutation', variables);
    },
    updateOutboundShipmentName(variables: UpdateOutboundShipmentNameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateOutboundShipmentNameMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateOutboundShipmentNameMutation>(UpdateOutboundShipmentNameDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateOutboundShipmentName', 'mutation', variables);
    },
    deleteOutboundShipments(variables: DeleteOutboundShipmentsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteOutboundShipmentsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteOutboundShipmentsMutation>(DeleteOutboundShipmentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteOutboundShipments', 'mutation', variables);
    },
    upsertOutboundShipment(variables: UpsertOutboundShipmentMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpsertOutboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertOutboundShipmentMutation>(UpsertOutboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'upsertOutboundShipment', 'mutation', variables);
    },
    deleteOutboundShipmentLines(variables: DeleteOutboundShipmentLinesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteOutboundShipmentLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteOutboundShipmentLinesMutation>(DeleteOutboundShipmentLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteOutboundShipmentLines', 'mutation', variables);
    },
    addToOutboundShipmentFromMasterList(variables: AddToOutboundShipmentFromMasterListMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AddToOutboundShipmentFromMasterListMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<AddToOutboundShipmentFromMasterListMutation>(AddToOutboundShipmentFromMasterListDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'addToOutboundShipmentFromMasterList', 'mutation', variables);
    },
    getItemPricing(variables: GetItemPricingQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetItemPricingQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetItemPricingQuery>(GetItemPricingDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getItemPricing', 'query', variables);
    },
    insertBarcode(variables: InsertBarcodeMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertBarcodeMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertBarcodeMutation>(InsertBarcodeDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertBarcode', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;