import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type InboundLineFragment = { __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, sellPricePerPack: number, expiryDate?: string | null, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, foreignCurrencyPriceBeforeTax?: number | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number }, location?: { __typename: 'LocationNode', name: string, id: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null };

export type InboundFragment = { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, taxPercentage?: number | null, currencyRate: number, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, sellPricePerPack: number, expiryDate?: string | null, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, foreignCurrencyPriceBeforeTax?: number | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number }, location?: { __typename: 'LocationNode', name: string, id: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number, taxPercentage?: number | null, foreignCurrencyTotalAfterTax?: number | null }, currency?: { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean } | null };

export type InboundRowFragment = { __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, deliveredDatetime?: string | null, id: string, invoiceNumber: number, otherPartyName: string, status: Types.InvoiceNodeStatus, colour?: string | null, theirReference?: string | null, taxPercentage?: number | null, onHold: boolean, currencyRate: number, pricing: { __typename: 'PricingNode', totalAfterTax: number, taxPercentage?: number | null, foreignCurrencyTotalAfterTax?: number | null }, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, currency?: { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean } | null };

export type InvoicesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type InvoicesQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, deliveredDatetime?: string | null, id: string, invoiceNumber: number, otherPartyName: string, status: Types.InvoiceNodeStatus, colour?: string | null, theirReference?: string | null, taxPercentage?: number | null, onHold: boolean, currencyRate: number, pricing: { __typename: 'PricingNode', totalAfterTax: number, taxPercentage?: number | null, foreignCurrencyTotalAfterTax?: number | null }, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, currency?: { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean } | null }> } };

export type InvoiceQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type InvoiceQuery = { __typename: 'Queries', invoice: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, taxPercentage?: number | null, currencyRate: number, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, sellPricePerPack: number, expiryDate?: string | null, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, foreignCurrencyPriceBeforeTax?: number | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number }, location?: { __typename: 'LocationNode', name: string, id: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number, taxPercentage?: number | null, foreignCurrencyTotalAfterTax?: number | null }, currency?: { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean } | null } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type InboundByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type InboundByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, transportReference?: string | null, type: Types.InvoiceNodeType, taxPercentage?: number | null, currencyRate: number, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, sellPricePerPack: number, expiryDate?: string | null, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, totalBeforeTax: number, totalAfterTax: number, taxPercentage?: number | null, foreignCurrencyPriceBeforeTax?: number | null, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number }, location?: { __typename: 'LocationNode', name: string, id: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number, taxPercentage?: number | null, foreignCurrencyTotalAfterTax?: number | null }, currency?: { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean } | null } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpdateInboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateInboundShipmentInput;
}>;


export type UpdateInboundShipmentMutation = { __typename: 'Mutations', updateInboundShipment: { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | { __typename: 'UpdateInboundShipmentError', error: { __typename: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'CannotIssueInForeignCurrency', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type DeleteInboundShipmentsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  deleteInboundShipments: Array<Types.DeleteInboundShipmentInput> | Types.DeleteInboundShipmentInput;
}>;


export type DeleteInboundShipmentsMutation = { __typename: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipments?: Array<{ __typename: 'DeleteInboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type InsertInboundShipmentMutationVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  otherPartyId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type InsertInboundShipmentMutation = { __typename: 'Mutations', insertInboundShipment: { __typename: 'InsertInboundShipmentError', error: { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type DeleteInboundShipmentLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchInboundShipmentInput;
}>;


export type DeleteInboundShipmentLinesMutation = { __typename: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipmentLines?: Array<{ __typename: 'DeleteInboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentLineError', error: { __typename: 'BatchIsReserved', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type ZeroLinesQuantityMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchInboundShipmentInput;
}>;


export type ZeroLinesQuantityMutation = { __typename: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', zeroLinesQuantity?: Array<{ __typename: 'ZeroInboundShipmentLineQuantityResponseWithId', id: string, response: { __typename: 'InvoiceLineNode', id: string } | { __typename: 'ZeroInboundShipmentLineQuantityError', error: { __typename: 'BatchIsReserved', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } }> | null } };

export type UpsertInboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchInboundShipmentInput;
}>;


export type UpsertInboundShipmentMutation = { __typename: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', updateInboundShipments?: Array<{ __typename: 'UpdateInboundShipmentResponseWithId', id: string, response: { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | { __typename: 'UpdateInboundShipmentError', error: { __typename: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'CannotIssueInForeignCurrency', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } | { __typename: 'RecordNotFound', description: string } } }> | null, insertInboundShipments?: Array<{ __typename: 'InsertInboundShipmentResponseWithId', id: string, response: { __typename: 'InsertInboundShipmentError', error: { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } }> | null, deleteInboundShipments?: Array<{ __typename: 'DeleteInboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, updateInboundShipmentServiceLines?: Array<{ __typename: 'UpdateInboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'InvoiceLineNode', id: string } | { __typename: 'UpdateInboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } }> | null, updateInboundShipmentLines?: Array<{ __typename: 'UpdateInboundShipmentLineResponseWithId', id: string, response: { __typename: 'InvoiceLineNode', id: string } | { __typename: 'UpdateInboundShipmentLineError', error: { __typename: 'BatchIsReserved', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'NotAnInboundShipment', description: string } | { __typename: 'RecordNotFound', description: string } } }> | null, zeroLinesQuantity?: Array<{ __typename: 'ZeroInboundShipmentLineQuantityResponseWithId', id: string, response: { __typename: 'InvoiceLineNode', id: string } | { __typename: 'ZeroInboundShipmentLineQuantityError', error: { __typename: 'BatchIsReserved', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } }> | null, insertInboundShipmentServiceLines?: Array<{ __typename: 'InsertInboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'InsertInboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } } | { __typename: 'InvoiceLineNode', id: string } }> | null, insertInboundShipmentLines?: Array<{ __typename: 'InsertInboundShipmentLineResponseWithId', id: string, response: { __typename: 'InsertInboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } } | { __typename: 'InvoiceLineNode', id: string } }> | null, deleteInboundShipmentServiceLines?: Array<{ __typename: 'DeleteInboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, deleteInboundShipmentLines?: Array<{ __typename: 'DeleteInboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentLineError', error: { __typename: 'BatchIsReserved', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type AddToInboundShipmentFromMasterListMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  shipmentId: Types.Scalars['String']['input'];
  masterListId: Types.Scalars['String']['input'];
}>;


export type AddToInboundShipmentFromMasterListMutation = { __typename: 'Mutations', addToInboundShipmentFromMasterList: { __typename: 'AddToInboundShipmentFromMasterListError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'MasterListNotFoundForThisStore', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'InvoiceLineConnector', totalCount: number } };

export const InboundLineFragmentDoc = gql`
    fragment InboundLine on InvoiceLineNode {
  __typename
  id
  type
  batch
  costPricePerPack
  sellPricePerPack
  expiryDate
  numberOfPacks
  packSize
  note
  type
  invoiceId
  totalBeforeTax
  totalAfterTax
  taxPercentage
  foreignCurrencyPriceBeforeTax
  item {
    __typename
    id
    name
    code
    unitName
    defaultPackSize
  }
  location {
    __typename
    name
    id
    code
    onHold
  }
  stockLine {
    __typename
    availableNumberOfPacks
    batch
    costPricePerPack
    expiryDate
    id
    itemId
    packSize
    sellPricePerPack
    storeId
    totalNumberOfPacks
    onHold
    note
  }
}
    `;
export const InboundFragmentDoc = gql`
    fragment Inbound on InvoiceNode {
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
  linkedShipment {
    __typename
    id
  }
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
      ...InboundLine
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
    ${InboundLineFragmentDoc}`;
export const InboundRowFragmentDoc = gql`
    fragment InboundRow on InvoiceNode {
  __typename
  comment
  createdDatetime
  deliveredDatetime
  id
  invoiceNumber
  otherPartyName
  status
  colour
  theirReference
  taxPercentage
  onHold
  pricing {
    __typename
    totalAfterTax
    taxPercentage
    foreignCurrencyTotalAfterTax
  }
  linkedShipment {
    id
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
      totalCount
      nodes {
        ...InboundRow
      }
    }
  }
}
    ${InboundRowFragmentDoc}`;
export const InvoiceDocument = gql`
    query invoice($id: String!, $storeId: String!) {
  invoice(id: $id, storeId: $storeId) {
    ... on InvoiceNode {
      ...Inbound
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
    ${InboundFragmentDoc}`;
export const InboundByNumberDocument = gql`
    query inboundByNumber($invoiceNumber: Int!, $storeId: String!) {
  invoiceByNumber(
    invoiceNumber: $invoiceNumber
    storeId: $storeId
    type: INBOUND_SHIPMENT
  ) {
    ... on InvoiceNode {
      ...Inbound
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
    ${InboundFragmentDoc}`;
export const UpdateInboundShipmentDocument = gql`
    mutation updateInboundShipment($storeId: String!, $input: UpdateInboundShipmentInput!) {
  updateInboundShipment(storeId: $storeId, input: $input) {
    ... on UpdateInboundShipmentError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on CannotChangeStatusOfInvoiceOnHold {
          __typename
          description
        }
        ... on CannotEditInvoice {
          __typename
          description
        }
        ... on CannotReverseInvoiceStatus {
          __typename
          description
        }
        ... on OtherPartyNotASupplier {
          __typename
          description
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
export const DeleteInboundShipmentsDocument = gql`
    mutation deleteInboundShipments($storeId: String!, $deleteInboundShipments: [DeleteInboundShipmentInput!]!) {
  batchInboundShipment(
    storeId: $storeId
    input: {deleteInboundShipments: $deleteInboundShipments}
  ) {
    __typename
    deleteInboundShipments {
      id
      response {
        ... on DeleteInboundShipmentError {
          __typename
          error {
            description
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
export const InsertInboundShipmentDocument = gql`
    mutation insertInboundShipment($id: String!, $otherPartyId: String!, $storeId: String!) {
  insertInboundShipment(
    storeId: $storeId
    input: {id: $id, otherPartyId: $otherPartyId}
  ) {
    ... on InsertInboundShipmentError {
      __typename
      error {
        description
        ... on OtherPartyNotASupplier {
          __typename
          description
        }
      }
    }
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
  }
}
    `;
export const DeleteInboundShipmentLinesDocument = gql`
    mutation deleteInboundShipmentLines($storeId: String!, $input: BatchInboundShipmentInput!) {
  batchInboundShipment(storeId: $storeId, input: $input) {
    deleteInboundShipmentLines {
      id
      response {
        ... on DeleteInboundShipmentLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on BatchIsReserved {
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
export const ZeroLinesQuantityDocument = gql`
    mutation zeroLinesQuantity($storeId: String!, $input: BatchInboundShipmentInput!) {
  batchInboundShipment(storeId: $storeId, input: $input) {
    zeroLinesQuantity {
      id
      response {
        ... on ZeroInboundShipmentLineQuantityError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on BatchIsReserved {
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
        ... on InvoiceLineNode {
          id
        }
      }
    }
  }
}
    `;
export const UpsertInboundShipmentDocument = gql`
    mutation upsertInboundShipment($storeId: String!, $input: BatchInboundShipmentInput!) {
  batchInboundShipment(storeId: $storeId, input: $input) {
    __typename
    updateInboundShipments {
      id
      response {
        ... on UpdateInboundShipmentError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotChangeStatusOfInvoiceOnHold {
              __typename
              description
            }
            ... on CannotEditInvoice {
              __typename
              description
            }
            ... on CannotReverseInvoiceStatus {
              __typename
              description
            }
            ... on OtherPartyNotASupplier {
              __typename
              description
            }
          }
        }
        ... on InvoiceNode {
          id
          invoiceNumber
        }
      }
    }
    insertInboundShipments {
      id
      response {
        ... on InsertInboundShipmentError {
          __typename
          error {
            description
            ... on OtherPartyNotASupplier {
              __typename
              description
            }
          }
        }
        ... on InvoiceNode {
          id
          invoiceNumber
        }
      }
    }
    deleteInboundShipments {
      id
      response {
        ... on DeleteInboundShipmentError {
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
    updateInboundShipmentServiceLines {
      id
      response {
        ... on UpdateInboundShipmentServiceLineError {
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
        ... on InvoiceLineNode {
          id
        }
      }
    }
    updateInboundShipmentLines {
      id
      response {
        ... on UpdateInboundShipmentLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on BatchIsReserved {
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
            ... on NotAnInboundShipment {
              __typename
              description
            }
          }
        }
        ... on InvoiceLineNode {
          id
        }
      }
    }
    zeroLinesQuantity {
      id
      response {
        ... on ZeroInboundShipmentLineQuantityError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on BatchIsReserved {
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
        ... on InvoiceLineNode {
          id
        }
      }
    }
    insertInboundShipmentServiceLines {
      id
      response {
        ... on InsertInboundShipmentServiceLineError {
          __typename
          error {
            description
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
        ... on InvoiceLineNode {
          id
        }
      }
    }
    insertInboundShipmentLines {
      id
      response {
        ... on InsertInboundShipmentLineError {
          __typename
          error {
            description
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
        ... on InvoiceLineNode {
          id
        }
      }
    }
    deleteInboundShipmentServiceLines {
      id
      response {
        ... on DeleteInboundShipmentServiceLineError {
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
    deleteInboundShipmentLines {
      id
      response {
        ... on DeleteInboundShipmentLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on BatchIsReserved {
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
export const AddToInboundShipmentFromMasterListDocument = gql`
    mutation addToInboundShipmentFromMasterList($storeId: String!, $shipmentId: String!, $masterListId: String!) {
  addToInboundShipmentFromMasterList(
    input: {shipmentId: $shipmentId, masterListId: $masterListId}
    storeId: $storeId
  ) {
    ... on AddToInboundShipmentFromMasterListError {
      __typename
      error {
        ... on MasterListNotFoundForThisStore {
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
    invoices(variables: InvoicesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InvoicesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoicesQuery>(InvoicesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoices', 'query');
    },
    invoice(variables: InvoiceQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InvoiceQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceQuery>(InvoiceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoice', 'query');
    },
    inboundByNumber(variables: InboundByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InboundByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InboundByNumberQuery>(InboundByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inboundByNumber', 'query');
    },
    updateInboundShipment(variables: UpdateInboundShipmentMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateInboundShipmentMutation>(UpdateInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateInboundShipment', 'mutation');
    },
    deleteInboundShipments(variables: DeleteInboundShipmentsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteInboundShipmentsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundShipmentsMutation>(DeleteInboundShipmentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundShipments', 'mutation');
    },
    insertInboundShipment(variables: InsertInboundShipmentMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertInboundShipmentMutation>(InsertInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertInboundShipment', 'mutation');
    },
    deleteInboundShipmentLines(variables: DeleteInboundShipmentLinesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteInboundShipmentLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundShipmentLinesMutation>(DeleteInboundShipmentLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundShipmentLines', 'mutation');
    },
    zeroLinesQuantity(variables: ZeroLinesQuantityMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ZeroLinesQuantityMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ZeroLinesQuantityMutation>(ZeroLinesQuantityDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'zeroLinesQuantity', 'mutation');
    },
    upsertInboundShipment(variables: UpsertInboundShipmentMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpsertInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertInboundShipmentMutation>(UpsertInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'upsertInboundShipment', 'mutation');
    },
    addToInboundShipmentFromMasterList(variables: AddToInboundShipmentFromMasterListMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AddToInboundShipmentFromMasterListMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<AddToInboundShipmentFromMasterListMutation>(AddToInboundShipmentFromMasterListDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'addToInboundShipmentFromMasterList', 'mutation');
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
 * mockInboundByNumberQuery((req, res, ctx) => {
 *   const { invoiceNumber, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoiceByNumber })
 *   )
 * })
 */
export const mockInboundByNumberQuery = (resolver: ResponseResolver<GraphQLRequest<InboundByNumberQueryVariables>, GraphQLContext<InboundByNumberQuery>, any>) =>
  graphql.query<InboundByNumberQuery, InboundByNumberQueryVariables>(
    'inboundByNumber',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateInboundShipmentMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateInboundShipment })
 *   )
 * })
 */
export const mockUpdateInboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateInboundShipmentMutationVariables>, GraphQLContext<UpdateInboundShipmentMutation>, any>) =>
  graphql.mutation<UpdateInboundShipmentMutation, UpdateInboundShipmentMutationVariables>(
    'updateInboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteInboundShipmentsMutation((req, res, ctx) => {
 *   const { storeId, deleteInboundShipments } = req.variables;
 *   return res(
 *     ctx.data({ batchInboundShipment })
 *   )
 * })
 */
export const mockDeleteInboundShipmentsMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteInboundShipmentsMutationVariables>, GraphQLContext<DeleteInboundShipmentsMutation>, any>) =>
  graphql.mutation<DeleteInboundShipmentsMutation, DeleteInboundShipmentsMutationVariables>(
    'deleteInboundShipments',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertInboundShipmentMutation((req, res, ctx) => {
 *   const { id, otherPartyId, storeId } = req.variables;
 *   return res(
 *     ctx.data({ insertInboundShipment })
 *   )
 * })
 */
export const mockInsertInboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<InsertInboundShipmentMutationVariables>, GraphQLContext<InsertInboundShipmentMutation>, any>) =>
  graphql.mutation<InsertInboundShipmentMutation, InsertInboundShipmentMutationVariables>(
    'insertInboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteInboundShipmentLinesMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ batchInboundShipment })
 *   )
 * })
 */
export const mockDeleteInboundShipmentLinesMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteInboundShipmentLinesMutationVariables>, GraphQLContext<DeleteInboundShipmentLinesMutation>, any>) =>
  graphql.mutation<DeleteInboundShipmentLinesMutation, DeleteInboundShipmentLinesMutationVariables>(
    'deleteInboundShipmentLines',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockZeroLinesQuantityMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ batchInboundShipment })
 *   )
 * })
 */
export const mockZeroLinesQuantityMutation = (resolver: ResponseResolver<GraphQLRequest<ZeroLinesQuantityMutationVariables>, GraphQLContext<ZeroLinesQuantityMutation>, any>) =>
  graphql.mutation<ZeroLinesQuantityMutation, ZeroLinesQuantityMutationVariables>(
    'zeroLinesQuantity',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpsertInboundShipmentMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ batchInboundShipment })
 *   )
 * })
 */
export const mockUpsertInboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<UpsertInboundShipmentMutationVariables>, GraphQLContext<UpsertInboundShipmentMutation>, any>) =>
  graphql.mutation<UpsertInboundShipmentMutation, UpsertInboundShipmentMutationVariables>(
    'upsertInboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAddToInboundShipmentFromMasterListMutation((req, res, ctx) => {
 *   const { storeId, shipmentId, masterListId } = req.variables;
 *   return res(
 *     ctx.data({ addToInboundShipmentFromMasterList })
 *   )
 * })
 */
export const mockAddToInboundShipmentFromMasterListMutation = (resolver: ResponseResolver<GraphQLRequest<AddToInboundShipmentFromMasterListMutationVariables>, GraphQLContext<AddToInboundShipmentFromMasterListMutation>, any>) =>
  graphql.mutation<AddToInboundShipmentFromMasterListMutation, AddToInboundShipmentFromMasterListMutationVariables>(
    'addToInboundShipmentFromMasterList',
    resolver
  )
