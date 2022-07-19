import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type InboundLineFragment = { __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, sellPricePerPack: number, expiryDate?: string | null, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, totalBeforeTax: number, totalAfterTax: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', name: string, id: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null };

export type InboundFragment = { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, type: Types.InvoiceNodeType, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, sellPricePerPack: number, expiryDate?: string | null, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, totalBeforeTax: number, totalAfterTax: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', name: string, id: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } };

export type InboundRowFragment = { __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyName: string, status: Types.InvoiceNodeStatus, colour?: string | null, theirReference?: string | null, pricing: { __typename: 'PricingNode', totalAfterTax: number }, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null };

export type InvoicesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type InvoicesQuery = { __typename: 'FullQuery', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyName: string, status: Types.InvoiceNodeStatus, colour?: string | null, theirReference?: string | null, pricing: { __typename: 'PricingNode', totalAfterTax: number }, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null }> } };

export type InvoiceQueryVariables = Types.Exact<{
  id: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type InvoiceQuery = { __typename: 'FullQuery', invoice: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, type: Types.InvoiceNodeType, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, sellPricePerPack: number, expiryDate?: string | null, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, totalBeforeTax: number, totalAfterTax: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', name: string, id: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type InboundByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int'];
  storeId: Types.Scalars['String'];
}>;


export type InboundByNumberQuery = { __typename: 'FullQuery', invoiceByNumber: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, type: Types.InvoiceNodeType, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, requisition?: { __typename: 'RequisitionNode', id: string, requisitionNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, sellPricePerPack: number, expiryDate?: string | null, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, totalBeforeTax: number, totalAfterTax: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', name: string, id: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean }, pricing: { __typename: 'PricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpdateInboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateInboundShipmentInput;
}>;


export type UpdateInboundShipmentMutation = { __typename: 'FullMutation', updateInboundShipment: { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | { __typename: 'UpdateInboundShipmentError', error: { __typename: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type DeleteInboundShipmentsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  deleteInboundShipments: Array<Types.DeleteInboundShipmentInput> | Types.DeleteInboundShipmentInput;
}>;


export type DeleteInboundShipmentsMutation = { __typename: 'FullMutation', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipments?: Array<{ __typename: 'DeleteInboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type InsertInboundShipmentMutationVariables = Types.Exact<{
  id: Types.Scalars['String'];
  otherPartyId: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type InsertInboundShipmentMutation = { __typename: 'FullMutation', insertInboundShipment: { __typename: 'InsertInboundShipmentError', error: { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type DeleteInboundShipmentLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.BatchInboundShipmentInput;
}>;


export type DeleteInboundShipmentLinesMutation = { __typename: 'FullMutation', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipmentLines?: Array<{ __typename: 'DeleteInboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentLineError', error: { __typename: 'BatchIsReserved', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type InvoiceCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']>;
}>;


export type InvoiceCountsQuery = { __typename: 'FullQuery', invoiceCounts: { __typename: 'InvoiceCounts', inbound: { __typename: 'InboundInvoiceCounts', created: { __typename: 'InvoiceCountsSummary', today: number, thisWeek: number } } } };

export type UpsertInboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.BatchInboundShipmentInput;
}>;


export type UpsertInboundShipmentMutation = { __typename: 'FullMutation', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', updateInboundShipments?: Array<{ __typename: 'UpdateInboundShipmentResponseWithId', id: string, response: { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | { __typename: 'UpdateInboundShipmentError', error: { __typename: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } | { __typename: 'RecordNotFound', description: string } } }> | null, insertInboundShipments?: Array<{ __typename: 'InsertInboundShipmentResponseWithId', id: string, response: { __typename: 'InsertInboundShipmentError', error: { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } }> | null, deleteInboundShipments?: Array<{ __typename: 'DeleteInboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, updateInboundShipmentServiceLines?: Array<{ __typename: 'UpdateInboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'InvoiceLineNode', id: string } | { __typename: 'UpdateInboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } }> | null, updateInboundShipmentLines?: Array<{ __typename: 'UpdateInboundShipmentLineResponseWithId', id: string, response: { __typename: 'InvoiceLineNode', id: string } | { __typename: 'UpdateInboundShipmentLineError', error: { __typename: 'BatchIsReserved', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'NotAnInboundShipment', description: string } | { __typename: 'RecordNotFound', description: string } } }> | null, insertInboundShipmentServiceLines?: Array<{ __typename: 'InsertInboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'InsertInboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } } | { __typename: 'InvoiceLineNode', id: string } }> | null, insertInboundShipmentLines?: Array<{ __typename: 'InsertInboundShipmentLineResponseWithId', id: string, response: { __typename: 'InsertInboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } } | { __typename: 'InvoiceLineNode', id: string } }> | null, deleteInboundShipmentServiceLines?: Array<{ __typename: 'DeleteInboundShipmentServiceLineResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentServiceLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null, deleteInboundShipmentLines?: Array<{ __typename: 'DeleteInboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentLineError', error: { __typename: 'BatchIsReserved', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

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
  item {
    __typename
    id
    name
    code
    unitName
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
  type
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
    ${InboundLineFragmentDoc}`;
export const InboundRowFragmentDoc = gql`
    fragment InboundRow on InvoiceNode {
  __typename
  comment
  createdDatetime
  allocatedDatetime
  id
  invoiceNumber
  otherPartyName
  status
  colour
  theirReference
  pricing {
    __typename
    totalAfterTax
  }
  linkedShipment {
    id
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
export const UpsertInboundShipmentDocument = gql`
    mutation upsertInboundShipment($storeId: String!, $input: BatchInboundShipmentInput!) {
  batchInboundShipment(storeId: $storeId, input: $input) {
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
    inboundByNumber(variables: InboundByNumberQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InboundByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InboundByNumberQuery>(InboundByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inboundByNumber', 'query');
    },
    updateInboundShipment(variables: UpdateInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateInboundShipmentMutation>(UpdateInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateInboundShipment', 'mutation');
    },
    deleteInboundShipments(variables: DeleteInboundShipmentsMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteInboundShipmentsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundShipmentsMutation>(DeleteInboundShipmentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundShipments', 'mutation');
    },
    insertInboundShipment(variables: InsertInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertInboundShipmentMutation>(InsertInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertInboundShipment', 'mutation');
    },
    deleteInboundShipmentLines(variables: DeleteInboundShipmentLinesMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteInboundShipmentLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundShipmentLinesMutation>(DeleteInboundShipmentLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundShipmentLines', 'mutation');
    },
    invoiceCounts(variables: InvoiceCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InvoiceCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceCountsQuery>(InvoiceCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoiceCounts', 'query');
    },
    upsertInboundShipment(variables: UpsertInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpsertInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertInboundShipmentMutation>(UpsertInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'upsertInboundShipment', 'mutation');
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
