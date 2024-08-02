import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type OutboundReturnRowFragment = { __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, comment?: string | null, theirReference?: string | null };

export type InboundReturnRowFragment = { __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string, deliveredDatetime?: string | null, comment?: string | null, theirReference?: string | null, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null };

export type OutboundReturnFragment = { __typename: 'InvoiceNode', id: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, otherPartyName: string, otherPartyId: string, theirReference?: string | null, transportReference?: string | null, otherPartyStore?: { __typename: 'StoreNode', code: string } | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, originalShipment?: { __typename: 'InvoiceNode', invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null };

export type InboundReturnFragment = { __typename: 'InvoiceNode', id: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, otherPartyId: string, otherPartyName: string, theirReference?: string | null, transportReference?: string | null, otherPartyStore?: { __typename: 'StoreNode', code: string } | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, originalShipment?: { __typename: 'InvoiceNode', invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null };

export type OutboundReturnLineFragment = { __typename: 'InvoiceLineNode', id: string, itemCode: string, itemName: string, itemId: string, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, sellPricePerPack: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number } };

export type InboundReturnLineFragment = { __typename: 'InvoiceLineNode', id: string, itemId: string, itemCode: string, itemName: string, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number } };

export type OutboundReturnsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type OutboundReturnsQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, comment?: string | null, theirReference?: string | null }> } };

export type InboundReturnsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type InboundReturnsQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string, deliveredDatetime?: string | null, comment?: string | null, theirReference?: string | null, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null }> } };

export type GenerateOutboundReturnLineFragment = { __typename: 'OutboundReturnLineNode', availableNumberOfPacks: number, batch?: string | null, expiryDate?: string | null, id: string, numberOfPacksToReturn: number, packSize: number, stockLineId: string, note?: string | null, reasonId?: string | null, itemName: string, itemCode: string, item: { __typename: 'ItemNode', id: string, unitName?: string | null } };

export type GenerateOutboundReturnLinesQueryVariables = Types.Exact<{
  input: Types.GenerateOutboundReturnLinesInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type GenerateOutboundReturnLinesQuery = { __typename: 'Queries', generateOutboundReturnLines: { __typename: 'OutboundReturnLineConnector', nodes: Array<{ __typename: 'OutboundReturnLineNode', availableNumberOfPacks: number, batch?: string | null, expiryDate?: string | null, id: string, numberOfPacksToReturn: number, packSize: number, stockLineId: string, note?: string | null, reasonId?: string | null, itemName: string, itemCode: string, item: { __typename: 'ItemNode', id: string, unitName?: string | null } }> } };

export type GenerateInboundReturnLineFragment = { __typename: 'InboundReturnLineNode', batch?: string | null, expiryDate?: string | null, id: string, packSize: number, stockLineId?: string | null, numberOfPacksReturned: number, numberOfPacksIssued?: number | null, note?: string | null, reasonId?: string | null, itemName: string, itemCode: string, item: { __typename: 'ItemNode', id: string, unitName?: string | null, code: string, name: string } };

export type GenerateInboundReturnLinesQueryVariables = Types.Exact<{
  input: Types.GenerateInboundReturnLinesInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type GenerateInboundReturnLinesQuery = { __typename: 'Queries', generateInboundReturnLines: { __typename: 'GeneratedInboundReturnLineConnector', nodes: Array<{ __typename: 'InboundReturnLineNode', batch?: string | null, expiryDate?: string | null, id: string, packSize: number, stockLineId?: string | null, numberOfPacksReturned: number, numberOfPacksIssued?: number | null, note?: string | null, reasonId?: string | null, itemName: string, itemCode: string, item: { __typename: 'ItemNode', id: string, unitName?: string | null, code: string, name: string } }> } };

export type OutboundReturnByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type OutboundReturnByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, otherPartyName: string, otherPartyId: string, theirReference?: string | null, transportReference?: string | null, lines: { __typename: 'InvoiceLineConnector', nodes: Array<{ __typename: 'InvoiceLineNode', id: string, itemCode: string, itemName: string, itemId: string, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, sellPricePerPack: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number } }> }, otherPartyStore?: { __typename: 'StoreNode', code: string } | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, originalShipment?: { __typename: 'InvoiceNode', invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null } | { __typename: 'NodeError' } };

export type InboundReturnByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type InboundReturnByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, onHold: boolean, comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, shippedDatetime?: string | null, deliveredDatetime?: string | null, verifiedDatetime?: string | null, otherPartyId: string, otherPartyName: string, theirReference?: string | null, transportReference?: string | null, lines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string, itemId: string, itemCode: string, itemName: string, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null, defaultPackSize: number } }> }, otherPartyStore?: { __typename: 'StoreNode', code: string } | null, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, linkedShipment?: { __typename: 'InvoiceNode', id: string } | null, originalShipment?: { __typename: 'InvoiceNode', invoiceNumber: number, createdDatetime: string, user?: { __typename: 'UserNode', username: string } | null } | null } | { __typename: 'NodeError' } };

export type InsertOutboundReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.OutboundReturnInput;
}>;


export type InsertOutboundReturnMutation = { __typename: 'Mutations', insertOutboundReturn: { __typename: 'InsertOutboundReturnError', error: { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type UpdateOutboundReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateOutboundReturnInput;
}>;


export type UpdateOutboundReturnMutation = { __typename: 'Mutations', updateOutboundReturn: { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type UpdateOutboundReturnLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateOutboundReturnLinesInput;
}>;


export type UpdateOutboundReturnLinesMutation = { __typename: 'Mutations', updateOutboundReturnLines: { __typename: 'InvoiceNode', id: string } };

export type InsertInboundReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InboundReturnInput;
}>;


export type InsertInboundReturnMutation = { __typename: 'Mutations', insertInboundReturn: { __typename: 'InsertInboundReturnError', error: { __typename: 'OtherPartyNotACustomer', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type DeleteOutboundReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  id: Types.Scalars['String']['input'];
}>;


export type DeleteOutboundReturnMutation = { __typename: 'Mutations', deleteOutboundReturn: { __typename: 'DeleteOutboundReturnError' } | { __typename: 'DeleteResponse', id: string } };

export type UpdateInboundReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateInboundReturnInput;
}>;


export type UpdateInboundReturnMutation = { __typename: 'Mutations', updateInboundReturn: { __typename: 'InvoiceNode', id: string } };

export type UpdateInboundReturnLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateInboundReturnLinesInput;
}>;


export type UpdateInboundReturnLinesMutation = { __typename: 'Mutations', updateInboundReturnLines: { __typename: 'InvoiceNode', id: string } };

export type DeleteInboundReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  id: Types.Scalars['String']['input'];
}>;


export type DeleteInboundReturnMutation = { __typename: 'Mutations', deleteInboundReturn: { __typename: 'DeleteInboundReturnError' } | { __typename: 'DeleteResponse', id: string } };

export const OutboundReturnRowFragmentDoc = gql`
    fragment OutboundReturnRow on InvoiceNode {
  __typename
  id
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
export const InboundReturnRowFragmentDoc = gql`
    fragment InboundReturnRow on InvoiceNode {
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
export const OutboundReturnFragmentDoc = gql`
    fragment OutboundReturn on InvoiceNode {
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
  otherPartyStore {
    code
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
export const InboundReturnFragmentDoc = gql`
    fragment InboundReturn on InvoiceNode {
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
  otherPartyStore {
    code
  }
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
}
    `;
export const OutboundReturnLineFragmentDoc = gql`
    fragment OutboundReturnLine on InvoiceLineNode {
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
export const InboundReturnLineFragmentDoc = gql`
    fragment InboundReturnLine on InvoiceLineNode {
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
export const GenerateOutboundReturnLineFragmentDoc = gql`
    fragment GenerateOutboundReturnLine on OutboundReturnLineNode {
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
export const GenerateInboundReturnLineFragmentDoc = gql`
    fragment GenerateInboundReturnLine on InboundReturnLineNode {
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
export const OutboundReturnsDocument = gql`
    query outboundReturns($first: Int, $offset: Int, $key: InvoiceSortFieldInput!, $desc: Boolean, $filter: InvoiceFilterInput, $storeId: String!) {
  invoices(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
  ) {
    ... on InvoiceConnector {
      __typename
      nodes {
        ...OutboundReturnRow
      }
      totalCount
    }
  }
}
    ${OutboundReturnRowFragmentDoc}`;
export const InboundReturnsDocument = gql`
    query inboundReturns($first: Int, $offset: Int, $key: InvoiceSortFieldInput!, $desc: Boolean, $filter: InvoiceFilterInput, $storeId: String!) {
  invoices(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
  ) {
    ... on InvoiceConnector {
      __typename
      nodes {
        ...InboundReturnRow
      }
      totalCount
    }
  }
}
    ${InboundReturnRowFragmentDoc}`;
export const GenerateOutboundReturnLinesDocument = gql`
    query generateOutboundReturnLines($input: GenerateOutboundReturnLinesInput!, $storeId: String!) {
  generateOutboundReturnLines(input: $input, storeId: $storeId) {
    ... on OutboundReturnLineConnector {
      nodes {
        ...GenerateOutboundReturnLine
      }
    }
  }
}
    ${GenerateOutboundReturnLineFragmentDoc}`;
export const GenerateInboundReturnLinesDocument = gql`
    query generateInboundReturnLines($input: GenerateInboundReturnLinesInput!, $storeId: String!) {
  generateInboundReturnLines(input: $input, storeId: $storeId) {
    ... on GeneratedInboundReturnLineConnector {
      nodes {
        ...GenerateInboundReturnLine
      }
    }
  }
}
    ${GenerateInboundReturnLineFragmentDoc}`;
export const OutboundReturnByNumberDocument = gql`
    query outboundReturnByNumber($invoiceNumber: Int!, $storeId: String!) {
  invoiceByNumber(
    invoiceNumber: $invoiceNumber
    storeId: $storeId
    type: OUTBOUND_RETURN
  ) {
    ... on InvoiceNode {
      __typename
      ...OutboundReturn
      lines {
        nodes {
          ...OutboundReturnLine
        }
      }
    }
  }
}
    ${OutboundReturnFragmentDoc}
${OutboundReturnLineFragmentDoc}`;
export const InboundReturnByNumberDocument = gql`
    query inboundReturnByNumber($invoiceNumber: Int!, $storeId: String!) {
  invoiceByNumber(
    invoiceNumber: $invoiceNumber
    storeId: $storeId
    type: INBOUND_RETURN
  ) {
    ... on InvoiceNode {
      __typename
      ...InboundReturn
      lines {
        nodes {
          ...InboundReturnLine
        }
        totalCount
      }
    }
  }
}
    ${InboundReturnFragmentDoc}
${InboundReturnLineFragmentDoc}`;
export const InsertOutboundReturnDocument = gql`
    mutation insertOutboundReturn($storeId: String!, $input: OutboundReturnInput!) {
  insertOutboundReturn(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
    ... on InsertOutboundReturnError {
      __typename
      error {
        __typename
        description
      }
    }
  }
}
    `;
export const UpdateOutboundReturnDocument = gql`
    mutation updateOutboundReturn($storeId: String!, $input: UpdateOutboundReturnInput!) {
  updateOutboundReturn(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
  }
}
    `;
export const UpdateOutboundReturnLinesDocument = gql`
    mutation updateOutboundReturnLines($storeId: String!, $input: UpdateOutboundReturnLinesInput!) {
  updateOutboundReturnLines(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
    }
  }
}
    `;
export const InsertInboundReturnDocument = gql`
    mutation insertInboundReturn($storeId: String!, $input: InboundReturnInput!) {
  insertInboundReturn(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
    ... on InsertInboundReturnError {
      __typename
      error {
        __typename
        description
      }
    }
  }
}
    `;
export const DeleteOutboundReturnDocument = gql`
    mutation deleteOutboundReturn($storeId: String!, $id: String!) {
  deleteOutboundReturn(storeId: $storeId, id: $id) {
    __typename
    ... on DeleteResponse {
      id
    }
  }
}
    `;
export const UpdateInboundReturnDocument = gql`
    mutation updateInboundReturn($storeId: String!, $input: UpdateInboundReturnInput!) {
  updateInboundReturn(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
    }
  }
}
    `;
export const UpdateInboundReturnLinesDocument = gql`
    mutation updateInboundReturnLines($storeId: String!, $input: UpdateInboundReturnLinesInput!) {
  updateInboundReturnLines(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
    }
  }
}
    `;
export const DeleteInboundReturnDocument = gql`
    mutation deleteInboundReturn($storeId: String!, $id: String!) {
  deleteInboundReturn(storeId: $storeId, id: $id) {
    __typename
    ... on DeleteResponse {
      id
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    outboundReturns(variables: OutboundReturnsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<OutboundReturnsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OutboundReturnsQuery>(OutboundReturnsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'outboundReturns', 'query', variables);
    },
    inboundReturns(variables: InboundReturnsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InboundReturnsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InboundReturnsQuery>(InboundReturnsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inboundReturns', 'query', variables);
    },
    generateOutboundReturnLines(variables: GenerateOutboundReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GenerateOutboundReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GenerateOutboundReturnLinesQuery>(GenerateOutboundReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'generateOutboundReturnLines', 'query', variables);
    },
    generateInboundReturnLines(variables: GenerateInboundReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GenerateInboundReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GenerateInboundReturnLinesQuery>(GenerateInboundReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'generateInboundReturnLines', 'query', variables);
    },
    outboundReturnByNumber(variables: OutboundReturnByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<OutboundReturnByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OutboundReturnByNumberQuery>(OutboundReturnByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'outboundReturnByNumber', 'query', variables);
    },
    inboundReturnByNumber(variables: InboundReturnByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InboundReturnByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InboundReturnByNumberQuery>(InboundReturnByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inboundReturnByNumber', 'query', variables);
    },
    insertOutboundReturn(variables: InsertOutboundReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertOutboundReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertOutboundReturnMutation>(InsertOutboundReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertOutboundReturn', 'mutation', variables);
    },
    updateOutboundReturn(variables: UpdateOutboundReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateOutboundReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateOutboundReturnMutation>(UpdateOutboundReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateOutboundReturn', 'mutation', variables);
    },
    updateOutboundReturnLines(variables: UpdateOutboundReturnLinesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateOutboundReturnLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateOutboundReturnLinesMutation>(UpdateOutboundReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateOutboundReturnLines', 'mutation', variables);
    },
    insertInboundReturn(variables: InsertInboundReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertInboundReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertInboundReturnMutation>(InsertInboundReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertInboundReturn', 'mutation', variables);
    },
    deleteOutboundReturn(variables: DeleteOutboundReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteOutboundReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteOutboundReturnMutation>(DeleteOutboundReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteOutboundReturn', 'mutation', variables);
    },
    updateInboundReturn(variables: UpdateInboundReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateInboundReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateInboundReturnMutation>(UpdateInboundReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateInboundReturn', 'mutation', variables);
    },
    updateInboundReturnLines(variables: UpdateInboundReturnLinesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateInboundReturnLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateInboundReturnLinesMutation>(UpdateInboundReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateInboundReturnLines', 'mutation', variables);
    },
    deleteInboundReturn(variables: DeleteInboundReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteInboundReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundReturnMutation>(DeleteInboundReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundReturn', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;