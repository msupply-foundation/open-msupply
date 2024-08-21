import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SupplierReturnRowFragment = { __typename: 'InvoiceNode', id: string, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, comment?: string | null, theirReference?: string | null };

export type CustomerReturnRowFragment = { __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string, deliveredDatetime?: string | null, comment?: string | null, theirReference?: string | null, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null };

export type SupplierReturnFragment = { __typename: 'InvoiceNode', id: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, otherPartyName: string, otherPartyId: string, theirReference?: string | null, transportReference?: string | null, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, originalShipment?: { __typename: 'InvoiceNode', invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null };

export type CustomerReturnFragment = { __typename: 'InvoiceNode', id: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, otherPartyId: string, otherPartyName: string, theirReference?: string | null, transportReference?: string | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, originalShipment?: { __typename: 'InvoiceNode', invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null } };

export type SupplierReturnLineFragment = { __typename: 'InvoiceLineNode', id: string, itemCode: string, itemName: string, itemId: string, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, sellPricePerPack: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number } };

export type CustomerReturnLineFragment = { __typename: 'InvoiceLineNode', id: string, itemId: string, itemCode: string, itemName: string, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number } };

export type SupplierReturnsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type SupplierReturnsQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, comment?: string | null, theirReference?: string | null }> } };

export type CustomerReturnsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type CustomerReturnsQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string, deliveredDatetime?: string | null, comment?: string | null, theirReference?: string | null, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null }> } };

export type GenerateSupplierReturnLineFragment = { __typename: 'SupplierReturnLineNode', availableNumberOfPacks: number, batch?: string | null, expiryDate?: string | null, id: string, numberOfPacksToReturn: number, packSize: number, stockLineId: string, note?: string | null, reasonId?: string | null, itemName: string, itemCode: string, item: { __typename: 'ItemNode', id: string, unitName?: string | null } };

export type GenerateSupplierReturnLinesQueryVariables = Types.Exact<{
  input: Types.GenerateSupplierReturnLinesInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type GenerateSupplierReturnLinesQuery = { __typename: 'Queries', generateSupplierReturnLines: { __typename: 'SupplierReturnLineConnector', nodes: Array<{ __typename: 'SupplierReturnLineNode', availableNumberOfPacks: number, batch?: string | null, expiryDate?: string | null, id: string, numberOfPacksToReturn: number, packSize: number, stockLineId: string, note?: string | null, reasonId?: string | null, itemName: string, itemCode: string, item: { __typename: 'ItemNode', id: string, unitName?: string | null } }> } };

export type GenerateCustomerReturnLineFragment = { __typename: 'CustomerReturnLineNode', batch?: string | null, expiryDate?: string | null, id: string, packSize: number, stockLineId?: string | null, numberOfPacksReturned: number, numberOfPacksIssued?: number | null, note?: string | null, reasonId?: string | null, itemName: string, itemCode: string, item: { __typename: 'ItemNode', id: string, unitName?: string | null, code: string, name: string } };

export type GenerateCustomerReturnLinesQueryVariables = Types.Exact<{
  input: Types.GenerateCustomerReturnLinesInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type GenerateCustomerReturnLinesQuery = { __typename: 'Queries', generateCustomerReturnLines: { __typename: 'GeneratedCustomerReturnLineConnector', nodes: Array<{ __typename: 'CustomerReturnLineNode', batch?: string | null, expiryDate?: string | null, id: string, packSize: number, stockLineId?: string | null, numberOfPacksReturned: number, numberOfPacksIssued?: number | null, note?: string | null, reasonId?: string | null, itemName: string, itemCode: string, item: { __typename: 'ItemNode', id: string, unitName?: string | null, code: string, name: string } }> } };

export type SupplierReturnByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type SupplierReturnByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, otherPartyName: string, otherPartyId: string, theirReference?: string | null, transportReference?: string | null, lines: { __typename: 'InvoiceLineConnector', nodes: Array<{ __typename: 'InvoiceLineNode', id: string, itemCode: string, itemName: string, itemId: string, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, sellPricePerPack: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number } }> }, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null }, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, originalShipment?: { __typename: 'InvoiceNode', invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null } | { __typename: 'NodeError' } };

export type CustomerReturnByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type CustomerReturnByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, otherPartyId: string, otherPartyName: string, theirReference?: string | null, transportReference?: string | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, itemId: string, itemCode: string, itemName: string, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number } }> }, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, originalShipment?: { __typename: 'InvoiceNode', invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, store?: { __typename: 'StoreNode', id: string, code: string } | null } } | { __typename: 'NodeError' } };

export type InsertSupplierReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.SupplierReturnInput;
}>;


export type InsertSupplierReturnMutation = { __typename: 'Mutations', insertSupplierReturn: { __typename: 'InsertSupplierReturnError', error: { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type UpdateSupplierReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateSupplierReturnInput;
}>;


export type UpdateSupplierReturnMutation = { __typename: 'Mutations', updateSupplierReturn: { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type UpdateSupplierReturnLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateSupplierReturnLinesInput;
}>;


export type UpdateSupplierReturnLinesMutation = { __typename: 'Mutations', updateSupplierReturnLines: { __typename: 'InvoiceNode', id: string } };

export type InsertCustomerReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.CustomerReturnInput;
}>;


export type InsertCustomerReturnMutation = { __typename: 'Mutations', insertCustomerReturn: { __typename: 'InsertCustomerReturnError', error: { __typename: 'OtherPartyNotACustomer', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type DeleteSupplierReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  id: Types.Scalars['String']['input'];
}>;


export type DeleteSupplierReturnMutation = { __typename: 'Mutations', deleteSupplierReturn: { __typename: 'DeleteResponse', id: string } | { __typename: 'DeleteSupplierReturnError' } };

export type UpdateCustomerReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateCustomerReturnInput;
}>;


export type UpdateCustomerReturnMutation = { __typename: 'Mutations', updateCustomerReturn: { __typename: 'InvoiceNode', id: string } | { __typename: 'UpdateCustomerReturnError' } };

export type UpdateCustomerReturnLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateCustomerReturnLinesInput;
}>;


export type UpdateCustomerReturnLinesMutation = { __typename: 'Mutations', updateCustomerReturnLines: { __typename: 'InvoiceNode', id: string } };

export type DeleteCustomerReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  id: Types.Scalars['String']['input'];
}>;


export type DeleteCustomerReturnMutation = { __typename: 'Mutations', deleteCustomerReturn: { __typename: 'DeleteCustomerReturnError' } | { __typename: 'DeleteResponse', id: string } };

export type UpdateSupplierReturnOtherPartyMutationVariables = Types.Exact<{
  input: Types.UpdateSupplierReturnOtherPartyInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type UpdateSupplierReturnOtherPartyMutation = { __typename: 'Mutations', updateSupplierReturnOtherParty: { __typename: 'InvoiceNode', id: string } | { __typename: 'UpdateSupplierReturnOtherPartyError', error: { __typename: 'InvoiceIsNotEditable', description: string } | { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } | { __typename: 'RecordNotFound', description: string } } };

export const SupplierReturnRowFragmentDoc = gql`
    fragment SupplierReturnRow on InvoiceNode {
  __typename
  id
  otherPartyId
  otherPartyName
  status
  invoiceNumber
  colour
  onHold
  createdDatetime
  pickedDatetime
  shippedDatetime
  deliveredDatetime
  verifiedDatetime
  comment
  theirReference
}
    `;
export const CustomerReturnRowFragmentDoc = gql`
    fragment CustomerReturnRow on InvoiceNode {
  __typename
  id
  otherPartyName
  status
  invoiceNumber
  colour
  createdDatetime
  deliveredDatetime
  comment
  theirReference
  linkedShipment {
    __typename
    id
  }
}
    `;
export const SupplierReturnFragmentDoc = gql`
    fragment SupplierReturn on InvoiceNode {
  __typename
  id
  status
  invoiceNumber
  colour
  onHold
  comment
  createdDatetime
  pickedDatetime
  shippedDatetime
  deliveredDatetime
  verifiedDatetime
  otherPartyName
  otherPartyId
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
  user {
    __typename
    username
    email
  }
  theirReference
  transportReference
  originalShipment {
    invoiceNumber
    createdDatetime
    user {
      username
    }
  }
}
    `;
export const CustomerReturnFragmentDoc = gql`
    fragment CustomerReturn on InvoiceNode {
  __typename
  id
  status
  invoiceNumber
  colour
  onHold
  comment
  createdDatetime
  pickedDatetime
  shippedDatetime
  deliveredDatetime
  verifiedDatetime
  otherPartyId
  otherPartyName
  user {
    __typename
    username
    email
  }
  linkedShipment {
    __typename
    id
  }
  theirReference
  transportReference
  originalShipment {
    __typename
    invoiceNumber
    createdDatetime
    user {
      username
    }
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
}
    `;
export const SupplierReturnLineFragmentDoc = gql`
    fragment SupplierReturnLine on InvoiceLineNode {
  id
  itemCode
  itemName
  itemId
  batch
  expiryDate
  numberOfPacks
  packSize
  sellPricePerPack
  item {
    __typename
    id
    name
    code
    unitName
    defaultPackSize
  }
}
    `;
export const CustomerReturnLineFragmentDoc = gql`
    fragment CustomerReturnLine on InvoiceLineNode {
  id
  itemId
  itemCode
  itemName
  batch
  expiryDate
  numberOfPacks
  packSize
  item {
    __typename
    id
    name
    code
    unitName
    defaultPackSize
  }
}
    `;
export const GenerateSupplierReturnLineFragmentDoc = gql`
    fragment GenerateSupplierReturnLine on SupplierReturnLineNode {
  availableNumberOfPacks
  batch
  expiryDate
  id
  numberOfPacksToReturn
  packSize
  stockLineId
  note
  reasonId
  itemName
  itemCode
  item {
    id
    unitName
  }
}
    `;
export const GenerateCustomerReturnLineFragmentDoc = gql`
    fragment GenerateCustomerReturnLine on CustomerReturnLineNode {
  batch
  expiryDate
  id
  packSize
  stockLineId
  numberOfPacksReturned
  numberOfPacksIssued
  note
  reasonId
  itemName
  itemCode
  item {
    id
    unitName
    code
    name
  }
}
    `;
export const SupplierReturnsDocument = gql`
    query supplierReturns($first: Int, $offset: Int, $key: InvoiceSortFieldInput!, $desc: Boolean, $filter: InvoiceFilterInput, $storeId: String!) {
  invoices(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
  ) {
    ... on InvoiceConnector {
      __typename
      nodes {
        ...SupplierReturnRow
      }
      totalCount
    }
  }
}
    ${SupplierReturnRowFragmentDoc}`;
export const CustomerReturnsDocument = gql`
    query customerReturns($first: Int, $offset: Int, $key: InvoiceSortFieldInput!, $desc: Boolean, $filter: InvoiceFilterInput, $storeId: String!) {
  invoices(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
  ) {
    ... on InvoiceConnector {
      __typename
      nodes {
        ...CustomerReturnRow
      }
      totalCount
    }
  }
}
    ${CustomerReturnRowFragmentDoc}`;
export const GenerateSupplierReturnLinesDocument = gql`
    query generateSupplierReturnLines($input: GenerateSupplierReturnLinesInput!, $storeId: String!) {
  generateSupplierReturnLines(input: $input, storeId: $storeId) {
    ... on SupplierReturnLineConnector {
      nodes {
        ...GenerateSupplierReturnLine
      }
    }
  }
}
    ${GenerateSupplierReturnLineFragmentDoc}`;
export const GenerateCustomerReturnLinesDocument = gql`
    query generateCustomerReturnLines($input: GenerateCustomerReturnLinesInput!, $storeId: String!) {
  generateCustomerReturnLines(input: $input, storeId: $storeId) {
    ... on GeneratedCustomerReturnLineConnector {
      nodes {
        ...GenerateCustomerReturnLine
      }
    }
  }
}
    ${GenerateCustomerReturnLineFragmentDoc}`;
export const SupplierReturnByNumberDocument = gql`
    query supplierReturnByNumber($invoiceNumber: Int!, $storeId: String!) {
  invoiceByNumber(
    invoiceNumber: $invoiceNumber
    storeId: $storeId
    type: SUPPLIER_RETURN
  ) {
    ... on InvoiceNode {
      __typename
      ...SupplierReturn
      lines {
        nodes {
          ...SupplierReturnLine
        }
      }
    }
  }
}
    ${SupplierReturnFragmentDoc}
${SupplierReturnLineFragmentDoc}`;
export const CustomerReturnByNumberDocument = gql`
    query customerReturnByNumber($invoiceNumber: Int!, $storeId: String!) {
  invoiceByNumber(
    invoiceNumber: $invoiceNumber
    storeId: $storeId
    type: CUSTOMER_RETURN
  ) {
    ... on InvoiceNode {
      __typename
      ...CustomerReturn
      lines {
        nodes {
          ...CustomerReturnLine
        }
        totalCount
      }
    }
  }
}
    ${CustomerReturnFragmentDoc}
${CustomerReturnLineFragmentDoc}`;
export const InsertSupplierReturnDocument = gql`
    mutation insertSupplierReturn($storeId: String!, $input: SupplierReturnInput!) {
  insertSupplierReturn(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
    ... on InsertSupplierReturnError {
      __typename
      error {
        __typename
        description
      }
    }
  }
}
    `;
export const UpdateSupplierReturnDocument = gql`
    mutation updateSupplierReturn($storeId: String!, $input: UpdateSupplierReturnInput!) {
  updateSupplierReturn(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
  }
}
    `;
export const UpdateSupplierReturnLinesDocument = gql`
    mutation updateSupplierReturnLines($storeId: String!, $input: UpdateSupplierReturnLinesInput!) {
  updateSupplierReturnLines(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
    }
  }
}
    `;
export const InsertCustomerReturnDocument = gql`
    mutation insertCustomerReturn($storeId: String!, $input: CustomerReturnInput!) {
  insertCustomerReturn(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
    ... on InsertCustomerReturnError {
      __typename
      error {
        __typename
        description
      }
    }
  }
}
    `;
export const DeleteSupplierReturnDocument = gql`
    mutation deleteSupplierReturn($storeId: String!, $id: String!) {
  deleteSupplierReturn(storeId: $storeId, id: $id) {
    __typename
    ... on DeleteResponse {
      id
    }
  }
}
    `;
export const UpdateCustomerReturnDocument = gql`
    mutation updateCustomerReturn($storeId: String!, $input: UpdateCustomerReturnInput!) {
  updateCustomerReturn(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
    }
  }
}
    `;
export const UpdateCustomerReturnLinesDocument = gql`
    mutation updateCustomerReturnLines($storeId: String!, $input: UpdateCustomerReturnLinesInput!) {
  updateCustomerReturnLines(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
    }
  }
}
    `;
export const DeleteCustomerReturnDocument = gql`
    mutation deleteCustomerReturn($storeId: String!, $id: String!) {
  deleteCustomerReturn(storeId: $storeId, id: $id) {
    __typename
    ... on DeleteResponse {
      id
    }
  }
}
    `;
export const UpdateSupplierReturnOtherPartyDocument = gql`
    mutation updateSupplierReturnOtherParty($input: UpdateSupplierReturnOtherPartyInput!, $storeId: String!) {
  updateSupplierReturnOtherParty(input: $input, storeId: $storeId) {
    ... on UpdateSupplierReturnOtherPartyError {
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
        ... on OtherPartyNotVisible {
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
      __typename
      id
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    supplierReturns(variables: SupplierReturnsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SupplierReturnsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SupplierReturnsQuery>(SupplierReturnsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'supplierReturns', 'query', variables);
    },
    customerReturns(variables: CustomerReturnsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CustomerReturnsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<CustomerReturnsQuery>(CustomerReturnsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'customerReturns', 'query', variables);
    },
    generateSupplierReturnLines(variables: GenerateSupplierReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GenerateSupplierReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GenerateSupplierReturnLinesQuery>(GenerateSupplierReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'generateSupplierReturnLines', 'query', variables);
    },
    generateCustomerReturnLines(variables: GenerateCustomerReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GenerateCustomerReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GenerateCustomerReturnLinesQuery>(GenerateCustomerReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'generateCustomerReturnLines', 'query', variables);
    },
    supplierReturnByNumber(variables: SupplierReturnByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SupplierReturnByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SupplierReturnByNumberQuery>(SupplierReturnByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'supplierReturnByNumber', 'query', variables);
    },
    customerReturnByNumber(variables: CustomerReturnByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CustomerReturnByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<CustomerReturnByNumberQuery>(CustomerReturnByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'customerReturnByNumber', 'query', variables);
    },
    insertSupplierReturn(variables: InsertSupplierReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertSupplierReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertSupplierReturnMutation>(InsertSupplierReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertSupplierReturn', 'mutation', variables);
    },
    updateSupplierReturn(variables: UpdateSupplierReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateSupplierReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateSupplierReturnMutation>(UpdateSupplierReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateSupplierReturn', 'mutation', variables);
    },
    updateSupplierReturnLines(variables: UpdateSupplierReturnLinesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateSupplierReturnLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateSupplierReturnLinesMutation>(UpdateSupplierReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateSupplierReturnLines', 'mutation', variables);
    },
    insertCustomerReturn(variables: InsertCustomerReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertCustomerReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertCustomerReturnMutation>(InsertCustomerReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertCustomerReturn', 'mutation', variables);
    },
    deleteSupplierReturn(variables: DeleteSupplierReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteSupplierReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteSupplierReturnMutation>(DeleteSupplierReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteSupplierReturn', 'mutation', variables);
    },
    updateCustomerReturn(variables: UpdateCustomerReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateCustomerReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateCustomerReturnMutation>(UpdateCustomerReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateCustomerReturn', 'mutation', variables);
    },
    updateCustomerReturnLines(variables: UpdateCustomerReturnLinesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateCustomerReturnLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateCustomerReturnLinesMutation>(UpdateCustomerReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateCustomerReturnLines', 'mutation', variables);
    },
    deleteCustomerReturn(variables: DeleteCustomerReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteCustomerReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteCustomerReturnMutation>(DeleteCustomerReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteCustomerReturn', 'mutation', variables);
    },
    updateSupplierReturnOtherParty(variables: UpdateSupplierReturnOtherPartyMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateSupplierReturnOtherPartyMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateSupplierReturnOtherPartyMutation>(UpdateSupplierReturnOtherPartyDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateSupplierReturnOtherParty', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;