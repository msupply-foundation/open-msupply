import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type InboundShipmentFragment = { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, status: Types.InvoiceNodeStatus, theirReference?: string | null, type: Types.InvoiceNodeType, otherPartyId: string, otherPartyName: string, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemCode: string, itemId: string, itemName: string, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, locationName?: string | null, sellPricePerPack: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, isVisible: boolean, unitName?: string | null, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableMonthsOfStockOnHand: number, availableStockOnHand: number }, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, availableNumberOfPacks: number, costPricePerPack: number, itemId: string, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, expiryDate?: string | null }> } }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean, stock: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, costPricePerPack: number, itemId: string, availableNumberOfPacks: number, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number }> } } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean }, pricing: { __typename: 'InvoicePricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } };

export type InboundShipmentRowFragment = { __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyId: string, otherPartyName: string, theirReference?: string | null, type: Types.InvoiceNodeType, status: Types.InvoiceNodeStatus, colour?: string | null, pricing: { __typename: 'InvoicePricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } };

export type InboundShipmentLineFragment = { __typename: 'InvoiceLineNode', type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemCode: string, itemId: string, itemName: string, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, locationName?: string | null, sellPricePerPack: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, isVisible: boolean, unitName?: string | null, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableMonthsOfStockOnHand: number, availableStockOnHand: number }, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, availableNumberOfPacks: number, costPricePerPack: number, itemId: string, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, expiryDate?: string | null }> } }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean, stock: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, costPricePerPack: number, itemId: string, availableNumberOfPacks: number, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number }> } } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null };

export type InvoicesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type InvoicesQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyId: string, otherPartyName: string, theirReference?: string | null, type: Types.InvoiceNodeType, status: Types.InvoiceNodeStatus, colour?: string | null, pricing: { __typename: 'InvoicePricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } }> } };

export type InvoiceQueryVariables = Types.Exact<{
  id: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type InvoiceQuery = { __typename: 'Queries', invoice: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, status: Types.InvoiceNodeStatus, theirReference?: string | null, type: Types.InvoiceNodeType, otherPartyId: string, otherPartyName: string, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemCode: string, itemId: string, itemName: string, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, locationName?: string | null, sellPricePerPack: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, isVisible: boolean, unitName?: string | null, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableMonthsOfStockOnHand: number, availableStockOnHand: number }, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, availableNumberOfPacks: number, costPricePerPack: number, itemId: string, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, expiryDate?: string | null }> } }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean, stock: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, costPricePerPack: number, itemId: string, availableNumberOfPacks: number, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number }> } } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean }, pricing: { __typename: 'InvoicePricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type InboundByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int'];
  storeId: Types.Scalars['String'];
}>;


export type InboundByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, status: Types.InvoiceNodeStatus, theirReference?: string | null, type: Types.InvoiceNodeType, otherPartyId: string, otherPartyName: string, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemCode: string, itemId: string, itemName: string, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, locationName?: string | null, sellPricePerPack: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, isVisible: boolean, unitName?: string | null, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableMonthsOfStockOnHand: number, availableStockOnHand: number }, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, availableNumberOfPacks: number, costPricePerPack: number, itemId: string, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, expiryDate?: string | null }> } }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean, stock: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, costPricePerPack: number, itemId: string, availableNumberOfPacks: number, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number }> } } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean }, pricing: { __typename: 'InvoicePricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpdateInboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateInboundShipmentInput;
}>;


export type UpdateInboundShipmentMutation = { __typename: 'Mutations', updateInboundShipment: { __typename: 'InvoiceNode', id: string } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'UpdateInboundShipmentError', error: { __typename: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'DatabaseError', description: string } | { __typename: 'ForeignKeyError', description: string } | { __typename: 'InvoiceDoesNotBelongToCurrentStore', description: string } | { __typename: 'NotAnInboundShipment', description: string } | { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type DeleteInboundShipmentsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  deleteInboundShipments: Array<Types.DeleteInboundShipmentInput> | Types.DeleteInboundShipmentInput;
}>;


export type DeleteInboundShipmentsMutation = { __typename: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipments?: Array<{ __typename: 'DeleteInboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'InvoiceDoesNotBelongToCurrentStore', description: string } | { __typename: 'NotAnInboundShipment', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type InsertInboundShipmentMutationVariables = Types.Exact<{
  id: Types.Scalars['String'];
  otherPartyId: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type InsertInboundShipmentMutation = { __typename: 'Mutations', insertInboundShipment: { __typename: 'InsertInboundShipmentError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'OtherPartyNotASupplier', description: string, otherParty: { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, name: string } } | { __typename: 'RecordAlreadyExist', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpsertInboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.BatchInboundShipmentInput;
}>;


export type UpsertInboundShipmentMutation = { __typename: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipmentLines?: Array<{ __typename: 'DeleteInboundShipmentLineResponseWithId', id: string }> | null, insertInboundShipmentLines?: Array<{ __typename: 'InsertInboundShipmentLineResponseWithId', id: string }> | null, updateInboundShipmentLines?: Array<{ __typename: 'UpdateInboundShipmentLineResponseWithId', id: string }> | null, updateInboundShipments?: Array<{ __typename: 'UpdateInboundShipmentResponseWithId', id: string }> | null } };

export type DeleteInboundShipmentLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.BatchInboundShipmentInput;
}>;


export type DeleteInboundShipmentLinesMutation = { __typename: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipmentLines?: Array<{ __typename: 'DeleteInboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentLineError', error: { __typename: 'BatchIsReserved', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'InvoiceDoesNotBelongToCurrentStore', description: string } | { __typename: 'InvoiceLineBelongsToAnotherInvoice', description: string } | { __typename: 'NotAnInboundShipment', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type InvoiceCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']>;
}>;


export type InvoiceCountsQuery = { __typename: 'Queries', invoiceCounts: { __typename: 'InvoiceCounts', inbound: { __typename: 'InboundInvoiceCounts', created: { __typename: 'InvoiceCountsSummary', today: number, thisWeek: number } } } };

export const InboundShipmentLineFragmentDoc = gql`
    fragment InboundShipmentLine on InvoiceLineNode {
  __typename
  type
  batch
  costPricePerPack
  expiryDate
  id
  itemCode
  itemId
  itemName
  numberOfPacks
  packSize
  note
  invoiceId
  locationName
  sellPricePerPack
  item {
    __typename
    id
    name
    code
    isVisible
    unitName
    stats(storeId: $storeId) {
      __typename
      averageMonthlyConsumption
      availableMonthsOfStockOnHand
      availableStockOnHand
    }
    availableBatches(storeId: $storeId) {
      __typename
      totalCount
      nodes {
        id
        availableNumberOfPacks
        costPricePerPack
        itemId
        onHold
        packSize
        sellPricePerPack
        storeId
        totalNumberOfPacks
        expiryDate
      }
    }
  }
  location {
    __typename
    id
    name
    code
    onHold
    stock {
      __typename
      totalCount
      nodes {
        id
        costPricePerPack
        itemId
        availableNumberOfPacks
        onHold
        packSize
        sellPricePerPack
        storeId
        totalNumberOfPacks
      }
    }
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
export const InboundShipmentFragmentDoc = gql`
    fragment InboundShipment on InvoiceNode {
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
  status
  theirReference
  type
  otherPartyId
  otherPartyName
  lines {
    __typename
    totalCount
    nodes {
      ...InboundShipmentLine
    }
  }
  otherParty {
    __typename
    id
    name
    code
    isCustomer
    isSupplier
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
    ${InboundShipmentLineFragmentDoc}`;
export const InboundShipmentRowFragmentDoc = gql`
    fragment InboundShipmentRow on InvoiceNode {
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
  type
  status
  colour
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
        ...InboundShipmentRow
      }
    }
  }
}
    ${InboundShipmentRowFragmentDoc}`;
export const InvoiceDocument = gql`
    query invoice($id: String!, $storeId: String!) {
  invoice(id: $id, storeId: $storeId) {
    ... on InvoiceNode {
      ...InboundShipment
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
    ${InboundShipmentFragmentDoc}`;
export const InboundByNumberDocument = gql`
    query inboundByNumber($invoiceNumber: Int!, $storeId: String!) {
  invoiceByNumber(
    invoiceNumber: $invoiceNumber
    storeId: $storeId
    type: INBOUND_SHIPMENT
  ) {
    ... on InvoiceNode {
      ...InboundShipment
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
    ${InboundShipmentFragmentDoc}`;
export const UpdateInboundShipmentDocument = gql`
    mutation updateInboundShipment($storeId: String!, $input: UpdateInboundShipmentInput!) {
  updateInboundShipment(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
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
    ... on UpdateInboundShipmentError {
      __typename
      error {
        description
      }
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
    __typename
    ... on InvoiceNode {
      id
      invoiceNumber
    }
    ... on InsertInboundShipmentError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on ForeignKeyError {
          __typename
          description
          key
        }
        ... on OtherPartyNotASupplier {
          __typename
          description
          otherParty {
            code
            id
            isCustomer
            isSupplier
            name
          }
        }
        ... on RecordAlreadyExist {
          __typename
          description
        }
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
export const UpsertInboundShipmentDocument = gql`
    mutation upsertInboundShipment($storeId: String!, $input: BatchInboundShipmentInput!) {
  batchInboundShipment(storeId: $storeId, input: $input) {
    deleteInboundShipmentLines {
      id
    }
    insertInboundShipmentLines {
      id
    }
    updateInboundShipmentLines {
      id
    }
    updateInboundShipments {
      id
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
        ... on DeleteResponse {
          id
        }
        ... on DeleteInboundShipmentLineError {
          __typename
          error {
            description
            ... on NotAnInboundShipment {
              __typename
              description
            }
            ... on InvoiceDoesNotBelongToCurrentStore {
              __typename
              description
            }
            ... on ForeignKeyError {
              __typename
              description
              key
            }
            ... on DatabaseError {
              __typename
              description
              fullError
            }
            ... on CannotEditInvoice {
              __typename
              description
            }
            ... on BatchIsReserved {
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
  }
}
    `;
export const InvoiceCountsDocument = gql`
    query invoiceCounts($storeId: String!, $timezoneOffset: Int) {
  invoiceCounts(storeId: $storeId, timezoneOffset: $timezoneOffset) {
    inbound {
      created {
        today
        thisWeek
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    invoices(variables: InvoicesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InvoicesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoicesQuery>(InvoicesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoices');
    },
    invoice(variables: InvoiceQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InvoiceQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceQuery>(InvoiceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoice');
    },
    inboundByNumber(variables: InboundByNumberQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InboundByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InboundByNumberQuery>(InboundByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inboundByNumber');
    },
    updateInboundShipment(variables: UpdateInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateInboundShipmentMutation>(UpdateInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateInboundShipment');
    },
    deleteInboundShipments(variables: DeleteInboundShipmentsMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteInboundShipmentsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundShipmentsMutation>(DeleteInboundShipmentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundShipments');
    },
    insertInboundShipment(variables: InsertInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertInboundShipmentMutation>(InsertInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertInboundShipment');
    },
    upsertInboundShipment(variables: UpsertInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpsertInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertInboundShipmentMutation>(UpsertInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'upsertInboundShipment');
    },
    deleteInboundShipmentLines(variables: DeleteInboundShipmentLinesMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteInboundShipmentLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundShipmentLinesMutation>(DeleteInboundShipmentLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundShipmentLines');
    },
    invoiceCounts(variables: InvoiceCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InvoiceCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceCountsQuery>(InvoiceCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoiceCounts');
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
